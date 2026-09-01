import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";
import { toSafeUser } from "../utils/serialize.js";
import { ensureNotAdminModification, hashPassword } from "./authService.js";

const USER_INCLUDE = { advertiser: { include: { company: true } } };

export function serializeUser(user) {
  return toSafeUser(user);
}

export async function listUsers({ page = 1, limit = 50, search }) {
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: USER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { rows: rows.map(serializeUser), total };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: USER_INCLUDE,
  });
  if (!user) throw new NotFoundError("Usuário não encontrado");
  return serializeUser(user);
}

export async function createUser({ name, email, password, role, companyId }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) throw new Prisma.PrismaClientKnownRequestError("duplicated", { code: "P2002", clientVersion: "5" });
    const passwordHash = hashPassword(password);
    const user = await tx.user.create({
      data: { name, email: email.toLowerCase().trim(), passwordHash, role },
    });
    if (role === "ADVERTISER") {
      await tx.advertiser.create({ data: { userId: user.id, companyId: companyId || null } });
    }
    return serializeUser(user);
  });
}

export async function updateUser(id, data, actor) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Usuário não encontrado");
  ensureNotAdminModification(actor, current);

  const payload = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.role !== undefined
      ? { role: data.role }
      : {}),
  };
  if (data.email !== undefined) {
    payload.email = data.email.toLowerCase().trim();
  }
  if (data.password) {
    payload.passwordHash = hashPassword(data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: payload,
    include: USER_INCLUDE,
  });

  if (user.role === "ADVERTISER" && current.role !== "ADVERTISER") {
    await prisma.advertiser.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, companyId: data.companyId || null },
    });
  }

  return serializeUser(user);
}

export async function removeUser(id, actor) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Usuário não encontrado");
  ensureNotAdminModification(actor, current);
  await prisma.user.delete({ where: { id } });
}