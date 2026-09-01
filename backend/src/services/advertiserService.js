import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";
import { hashPassword } from "./authService.js";
import { conflictCheck } from "../utils/dbHelpers.js";

const ADVERTISER_INCLUDE = {
  user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
  company: true,
  _count: { select: { campaigns: true } },
};

/** Serializa um anunciante como objeto composto (empresa + usuário). */
export function serializeAdvertiser(a) {
  const company = a.company;
  const user = a.user;
  return {
    id: a.id,
    userId: a.userId,
    companyId: a.companyId,
    name: company?.name || user?.name || "",
    contact_name: user?.name || "",
    email: company?.email || user?.email || "",
    phone: company?.phone || "",
    cnpj: company?.cnpj || "",
    status: "active",
    notes: company?.address || "",
    campaignCount: a._count?.campaigns ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    user,
    company,
  };
}

export async function listAdvertisers({ page = 1, limit = 50, search, user }) {
  const where = {};
  if (user.role === "ADVERTISER") {
    where.userId = user.id;
  }
  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { company: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.advertiser.findMany({
      where,
      include: ADVERTISER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.advertiser.count({ where }),
  ]);
  return { rows: rows.map(serializeAdvertiser), total };
}

export async function getAdvertiserById(id, user) {
  const advertiser = await prisma.advertiser.findUnique({
    where: { id },
    include: ADVERTISER_INCLUDE,
  });
  if (!advertiser) throw new NotFoundError("Anunciante não encontrado");
  if (user.role === "ADVERTISER" && advertiser.userId !== user.id) {
    throw new NotFoundError("Anunciante não encontrado");
  }
  return serializeAdvertiser(advertiser);
}
/**
 * Cria um anunciante: cria a empresa, cria usuário ADVERTISER (com senha
 * temporária se não informada) e o vínculo Advertiser.
 */
export async function createAdvertiser({
  name,
  email,
  phone,
  cnpj,
  contact_name,
  password,
}) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (normalizedEmail) {
    await conflictCheck(
      "user",
      { email: normalizedEmail },
      "Já existe um usuário com este e-mail",
    );
  }
  if (cnpj) {
    await conflictCheck("company", { cnpj }, "Já existe uma empresa com este CNPJ");
  }

  const finalPassword = password || cryptoRandomPassword(12);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        email: normalizedEmail || null,
        phone: phone || null,
        cnpj: cnpj || null,
      },
    });
    const user = await tx.user.create({
      data: {
        name: contact_name || name,
        email: normalizedEmail,
        passwordHash: hashPassword(finalPassword),
        role: "ADVERTISER",
      },
    });
    const advertiser = await tx.advertiser.create({
      data: { userId: user.id, companyId: company.id },
    });
    const full = await tx.advertiser.findUnique({
      where: { id: advertiser.id },
      include: ADVERTISER_INCLUDE,
    });
    return {
      advertiser: serializeAdvertiser(full),
      temporaryPassword: password ? undefined : finalPassword,
    };
  });
}

export async function updateAdvertiser(id, data) {
  const advertiser = await prisma.advertiser.findUnique({
    where: { id },
    include: { user: true, company: true },
  });
  if (!advertiser) throw new NotFoundError("Anunciante não encontrado");

  return prisma.$transaction(async (tx) => {
    if (advertiser.company) {
      await tx.company.update({
        where: { id: advertiser.companyId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined
            ? { email: (data.email || "").toLowerCase().trim() || null }
            : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.cnpj !== undefined ? { cnpj: data.cnpj || null } : {}),
          ...(data.notes !== undefined ? { address: data.notes || null } : {}),
        },
      });
    } else if (data.name || data.email) {
      const company = await tx.company.create({
        data: {
          name: data.name || "Empresa",
          email: (data.email || "").toLowerCase().trim() || null,
          phone: data.phone || null,
          cnpj: data.cnpj || null,
        },
      });
      await tx.advertiser.update({
        where: { id },
        data: { companyId: company.id },
      });
    }

    await tx.user.update({
      where: { id: advertiser.userId },
      data: {
        ...(data.contact_name !== undefined ? { name: data.contact_name } : {}),
        ...(data.email !== undefined
          ? { email: (data.email || "").toLowerCase().trim() }
          : {}),
        ...(data.password && data.password.length >= 6
          ? { passwordHash: hashPassword(data.password) }
          : {}),
      },
    });

    const full = await tx.advertiser.findUnique({
      where: { id },
      include: ADVERTISER_INCLUDE,
    });
    return serializeAdvertiser(full);
  });
}

export async function removeAdvertiser(id) {
  const advertiser = await prisma.advertiser.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!advertiser) throw new NotFoundError("Anunciante não encontrado");

  return prisma.$transaction(async (tx) => {
    await tx.advertiser.delete({ where: { id } });
    if (advertiser.user) {
      await tx.user
        .delete({ where: { id: advertiser.user.id } })
        .catch(() => {});
    }
  });
}

function cryptoRandomPassword(length) {
  const charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}