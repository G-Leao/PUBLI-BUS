import prisma from '../config/prisma.js';

export const companyService = {
  async list() {
    return prisma.company.findMany();
  },

  async getById(id) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new Error('Company not found');
    return company;
  },

  async create(data) {
    return prisma.company.create({ data });
  },

  async update(id, data) {
    return prisma.company.update({ where: { id }, data });
  },

  async delete(id) {
    return prisma.company.delete({ where: { id } });
  },
};
