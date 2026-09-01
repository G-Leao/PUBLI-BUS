import prisma from '../config/prisma.js';

export const impressionService = {
  async create(data) {
    return prisma.impression.create({ data, include: { campaign: true, tablet: true } });
  },

  async list(filters = {}) {
    const where = {};
    if (filters.campaignId) where.campaign = { id: filters.campaignId };
    if (filters.tabletId) where.tablet = { id: filters.tabletId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    return prisma.impression.findMany({ where, include: { campaign: true, tablet: true } });
  },

  async totalByCampaign(campaignId) {
    return prisma.impression.count({ where: { campaign: { id: campaignId } } });
  },

  async totalByTablet(tabletId) {
    return prisma.impression.count({ where: { tablet: { id: tabletId } } });
  },

  async totalDurationByCampaign(campaignId) {
    const result = await prisma.impression.aggregate({
      where: { campaign: { id: campaignId } },
      _sum: { durationSeconds: true },
    });
    return result._sum.durationSeconds || 0;
  },
};
