import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

export function serializeCompany(company) {
  return {
    ...company,
    advertiserCount: company._count?.advertisers ?? undefined,
  };
}

export async function listCompanies({ page = 1, limit = 50, search, user }) {
  const where = {};
  if (user.role === "ADVERTISER") {
    where.advertisers = { some: { userId: user.id } };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cnpj: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { _count: { select: { advertisers: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);
  return { rows: rows.map(serializeCompany), total };
}

export async function getCompanyById(id, user) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      advertisers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      _count: { select: { advertisers: true } },
    },
  });
  if (!company) throw new NotFoundError("Empresa não encontrada");
  if (user.role === "ADVERTISER") {
    const owns = company.advertisers.some((a) => a.userId === user.id);
    if (!owns) throw new NotFoundError("Empresa não encontrada");
  }
  return serializeCompany(company);
}

export async function createCompany(data) {
  return prisma.company.create({
    data,
    include: { _count: { select: { advertisers: true } } },
  });
}

export async function updateCompany(id, data) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Empresa não encontrada");
  return prisma.company.update({
    where: { id },
    data,
    include: { _count: { select: { advertisers: true } } },
  });
}

export async function removeCompany(id) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Empresa não encontrada");
  await prisma.company.delete({ where: { id } });
}