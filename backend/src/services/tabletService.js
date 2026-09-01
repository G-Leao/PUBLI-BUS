import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

const TABLET_INCLUDE = {
  bus: true,
  _count: { select: { impressions: true } },
};

export async function listTablets({ page = 1, limit = 100, status, search }) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { bus: { code: { contains: search, mode: "insensitive" } } },
      { bus: { line: { contains: search, mode: "insensitive" } } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.tablet.findMany({
      where,
      include: TABLET_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tablet.count({ where }),
  ]);
  return { rows, total };
}

export async function getTabletById(id) {
  const tablet = await prisma.tablet.findUnique({
    where: { id },
    include: TABLET_INCLUDE,
  });
  if (!tablet) throw new NotFoundError("Tablet não encontrado");
  return tablet;
}

export async function createTablet(data) {
  return prisma.tablet.create({ data, include: TABLET_INCLUDE });
}

export async function updateTablet(id, data) {
  const existing = await prisma.tablet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tablet não encontrado");
  return prisma.tablet.update({ where: { id }, data, include: TABLET_INCLUDE });
}

export async function removeTablet(id) {
  const existing = await prisma.tablet.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tablet não encontrado");
  await prisma.tablet.delete({ where: { id } });
}

/** Atualiza lastSeenAt e marca o tablet ONLINE quando recebe uma exibição. */
export async function touchTablet(id) {
  return prisma.tablet.update({
    where: { id },
    data: { lastSeenAt: new Date(), status: "ONLINE" },
  });
}