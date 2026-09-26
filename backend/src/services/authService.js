import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { prisma } from "../utils/prisma.js";
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from "../utils/AppError.js";
import { signToken } from "../utils/token.js";
import { toSafeUser } from "../utils/serialize.js";
import { env, isAuthDevMode } from "../config/env.js";
import { emailService } from "./emailService.js";

const SALT_ROUNDS = 10;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

export function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// ---------------------------------------------------------------------------
// Helpers criptográficos (OTP / tokens de recuperación)
// ---------------------------------------------------------------------------
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value)),
  );
  return Buffer.from(digest).toString("hex");
}

function constantTimeEqual(a, b) {
  const aa = new TextEncoder().encode(String(a));
  const bb = new TextEncoder().encode(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function generateOtp() {
  const bytes = crypto.randomBytes(4);
  const num =
    ((bytes[0] & 0x7f) << 24) |
    (bytes[1] << 16) |
    (bytes[2] << 8) |
    bytes[3];
  return String(num % 1000000).padStart(6, "0");
}

function randomTokenHex() {
  return crypto.randomBytes(32).toString("hex");
}

async function loginUserById(userId) {
  const full = await prisma.user.findUnique({
    where: { id: userId },
    include: { advertiser: { include: { company: true } } },
  });
  return { token: signToken(full), user: toSafeUser(full) };
}

/**
 * Cria um usuário (role ADVERTISER por padrão) e, se for advertiser,
 * cria o registro correspondente em Advertiser.
 * Nunca retorna passwordHash.
 */
export async function registerUser({ name, email, password, role = "ADVERTISER", companyId = null }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new ConflictError("Este e-mail já está cadastrado");
  }

  const passwordHash = hashPassword(password);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);

  let userId;
  if (role === "ADVERTISER") {
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash, role },
      });
      await tx.advertiser.create({
        data: { userId: user.id, companyId },
      });
      return user.id;
    });
  } else {
    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash, role },
    });
    userId = user.id;
  }

  try {
    const full = await prisma.user.findUnique({
      where: { id: userId },
      include: { advertiser: { include: { company: true } } },
    });
    await prisma.authCode.create({
      data: {
        userId,
        purpose: "EMAIL_VERIFICATION",
        codeHash: await sha256Hex(otp),
        expiresAt,
      },
    });
    await emailService.sendVerificationOtp(full, otp);
    const safe = toSafeUser(full);
    return isAuthDevMode() ? { user: safe, devOtp: otp } : { user: safe };
  } catch (error) {
    // Rollback: nunca dejar un usuario/código huérfano si el envío falla.
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { advertiser: { include: { company: true } } },
  });
  if (!user || !comparePassword(password, user.passwordHash)) {
    throw new UnauthorizedError("E-mail ou senha inválidos");
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(
      "Revisa tu correo para activar tu cuenta antes de iniciar sesión",
      403,
      [],
      "EMAIL_NOT_VERIFIED",
    );
  }
  const token = signToken(user);
  return { token, user: toSafeUser(user) };
}

export async function getUserProfile(user) {
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { advertiser: { include: { company: true } } },
  });
  if (!full) throw new NotFoundError("Usuário não encontrado");
  return toSafeUser(full);
}

/**
 * O usuário autenticado atualiza somente campos seguros do próprio perfil.
 * O id do usuário vem de req.user (JWT), nunca de input do cliente.
 * Campos administrativos (role, plan, email, password, ids) são ignorados.
 */
export async function updateProfile(user, { name, avatarUrl }) {
  const data = {};

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2) {
      throw new BadRequestError("Nome deve ter pelo menos 2 caracteres");
    }
    data.name = trimmed;
  }

  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl || null;
  }

  if (Object.keys(data).length === 0) {
    throw new BadRequestError("Nada para atualizar");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    include: { advertiser: { include: { company: true } } },
  });

  return toSafeUser(updated);
}

/**
 * Solicitud de recuperación: genera un token aleatorio de 32 bytes, guarda su
 * hash (uso único, 15 min) y lo envía por e-mail. La API NUNCA devuelve el
 * token: en modo dev se expone `devResetLink` para facilitar pruebas locales.
 */
export async function requestPasswordReset({ email }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) return {}; // nunca confirma existência de e-mail

  const rawToken = randomTokenHex();
  await prisma.authCode.deleteMany({
    where: { userId: user.id, purpose: "PASSWORD_RESET" },
  });
  await prisma.authCode.create({
    data: {
      userId: user.id,
      purpose: "PASSWORD_RESET",
      codeHash: await sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });
  const resetLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
  try {
    await emailService.sendPasswordResetLink(user, resetLink);
  } catch (error) {
    // Rollback: sin residuos de tokens que nadie llegó a recibir.
    await prisma.authCode.deleteMany({
      where: { userId: user.id, purpose: "PASSWORD_RESET" },
    });
    throw error;
  }
  return isAuthDevMode() ? { devResetLink: resetLink } : {};
}

/** Validar un token de recuperación de uso único y cambiar la contraseña. */
export async function resetUserPassword({ resetToken, newPassword }) {
  if (!resetToken) throw new BadRequestError("Token de redefinição é obrigatório");
  const tokenHash = await sha256Hex(resetToken);
  const record = await prisma.authCode.findFirst({
    where: {
      purpose: "PASSWORD_RESET",
      codeHash: tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) throw new BadRequestError("Link de redefinição inválido ou expirado");

  await prisma.$transaction([
    prisma.authCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: hashPassword(newPassword) },
    }),
  ]);
  return { success: true };
}

/** Verifica el OTP de email (uso único) y emite sesión si es correcto. */
export async function verifyEmailOtp({ email, otpCode }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) throw new UnauthorizedError("Código inválido ou expirado");

  const code = await prisma.authCode.findFirst({
    where: {
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!code) throw new UnauthorizedError("Código inválido ou expirado");
  if (code.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.authCode.update({
      where: { id: code.id },
      data: { usedAt: new Date() },
    });
    throw new UnauthorizedError("Código inválido ou expirado");
  }

  const expectedHash = await sha256Hex(String(otpCode || "").trim());
  if (!constantTimeEqual(code.codeHash, expectedHash)) {
    await prisma.authCode.update({
      where: { id: code.id },
      data: { attempts: { increment: 1 } },
    });
    throw new UnauthorizedError("Código inválido ou expirado");
  }

  await prisma.$transaction([
    prisma.authCode.update({
      where: { id: code.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
  return loginUserById(user.id);
}

/** Reenvío de OTP: invalida el código anterior y genera uno nuevo. */
export async function resendEmailOtp({ email }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user || user.emailVerifiedAt) return {}; // nunca confirma existência

  const otp = generateOtp();
  await prisma.authCode.deleteMany({
    where: { userId: user.id, purpose: "EMAIL_VERIFICATION" },
  });
  await prisma.authCode.create({
    data: {
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      codeHash: await sha256Hex(otp),
      expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });
  try {
    await emailService.sendVerificationOtp(user, otp);
  } catch (error) {
    // Rollback: no dejar códigos huérfanos si el envío falla.
    await prisma.authCode.deleteMany({
      where: { userId: user.id, purpose: "EMAIL_VERIFICATION" },
    });
    throw error;
  }
  return isAuthDevMode() ? { devOtp: otp } : {};
}

export function ensureNotAdminModification(actor, target) {
  if (actor.role !== "ADMIN" && target.role === "ADMIN") {
    throw new AppError("Acesso negado: apenas ADMIN pode gerenciar usuários administradores", 403);
  }
}