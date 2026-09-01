import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

const SPACE_INCLUDE = {
  bus: true,
  _count: { select: { campaignSpaces: true } },
};

function normalizeSpace(data) {
  const { price, ...rest } = data;
  return {
    ...rest,
    ...(price !== undefined ? { price: String(price) } : {}),
  };
}

export async function listSpaces({ page = 1, limit = 100, status, busId, search }) {
  const where = {};
  if (status) where.status = status;
  if (busId) where.busId = busId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { type: { contains: search, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.advertisingSpace.findMany({
      where,
      include: SPACE_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.advertisingSpace.count({ where }),
  ]);
  return { rows, total };
}

export async function getSpaceById(id) {
  const space = await prisma.advertisingSpace.findUnique({
    where: { id },
    include: SPACE_INCLUDE,
  });
  if (!space) throw new NotFoundError("Espaço publicitário não encontrado");
  return space;
}

export async function createSpace(data) {
  const payload = {
    ...data,
    price: data.price !== undefined ? data.price : "0",
  };
  return prisma.advertisingSpace.create({
    data: { ...payload, price: String(payload.price) },
    include: SPACE_INCLUDE,
  });
}

export async function updateSpace(id, data) {
  const existing = await prisma.advertisingSpace.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Espaço publicitário não encontrado");
  const payload = { ...data, ...(data.price !== undefined ? { price: String(data.price) } : {}) };
  return prisma.advertisingSpace.update({ where: { id }, data: payload, include: SPACE_INCLUDE });
}

export async function removeSpace(id) {
  const existing = await prisma.advertisingSpace.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Espaço publicitário não encontrado");
  await prisma.advertisingSpace.delete({ where: { id } });
}

export { normalizeSpace };