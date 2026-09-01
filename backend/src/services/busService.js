import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

const BUS_INCLUDE = {
  _count: { select: { advertisingSpaces: true, tablets: true, campaignBuses: true } },
};

export async function listBuses({ page = 1, limit = 100, search, status }) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { plate: { contains: search, mode: "insensitive" } },
      { line: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.bus.findMany({
      where,
      include: BUS_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bus.count({ where }),
  ]);
  return { rows, total };
}

export async function getBusById(id) {
  const bus = await prisma.bus.findUnique({ where: { id }, include: BUS_INCLUDE });
  if (!bus) throw new NotFoundError("Ônibus não encontrado");
  return bus;
}

export async function createBus(data) {
  return prisma.bus.create({ data, include: BUS_INCLUDE });
}

export async function updateBus(id, data) {
  const existing = await prisma.bus.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Ônibus não encontrado");
  return prisma.bus.update({ where: { id }, data, include: BUS_INCLUDE });
}

export async function removeBus(id) {
  const existing = await prisma.bus.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Ônibus não encontrado");
  await prisma.bus.delete({ where: { id } });
}