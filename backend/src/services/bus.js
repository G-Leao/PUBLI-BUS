import prisma from '../config/prisma.js';

export const busService = {
  async list() {
    return prisma.bus.findMany({ include: { advertisingSpaces: true, tablets: true } });
  },

  async getById(id) {
    const bus = await prisma.bus.findUnique({ where: { id }, include: { advertisingSpaces: true, tablets: true } });
    if (!bus) throw new Error('Bus not found');
    return bus;
  },

  async create(data) {
    return prisma.bus.create({ data, include: { advertisingSpaces: true, tablets: true } });
  },

  async update(id, data) {
    return prisma.bus.update({ where: { id }, data, include: { advertisingSpaces: true, tablets: true } });
  },

  async delete(id) {
    return prisma.bus.delete({ where: { id } });
  },
};
