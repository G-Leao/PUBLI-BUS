import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma.js";
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from "../utils/AppError.js";
import { signToken, signResetToken, verifyResetToken } from "../utils/token.js";
import { toSafeUser } from "../utils/serialize.js";

const SALT_ROUNDS = 10;

export function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
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

  if (role === "ADVERTISER") {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash, role },
      });
      const advertiser = await tx.advertiser.create({
        data: { userId: user.id, companyId },
      });
      const full = await tx.user.findUnique({
        where: { id: user.id },
        include: { advertiser: { include: { company: true } } },
      });
      return toSafeUser(full);
    });
  }

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role },
  });
  return toSafeUser(user);
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

/** Gera o token de redefinição (expira em 15min). Em dev retorna o token. */
export async function createPasswordResetToken({ email }) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) return {}; // nunca confirma existência de e-mail
  const resetToken = signResetToken(user.id);
  return { resetToken };
}

export async function resetUserPassword({ resetToken, newPassword }) {
  if (!resetToken) throw new BadRequestError("Token de redefinição é obrigatório");
  let userId;
  try {
    userId = verifyResetToken(resetToken);
  } catch {
    throw new BadRequestError("Link de redefinição inválido ou expirado");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Usuário não encontrado");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { success: true };
}

export function ensureNotAdminModification(actor, target) {
  if (actor.role !== "ADMIN" && target.role === "ADMIN") {
    throw new AppError("Acesso negado: apenas ADMIN pode gerenciar usuários administradores", 403);
  }
}