import prisma from '../config/prisma.js';

export const dashboardService = {
  async getStats() {
    const totalCampaigns = await prisma.campaign.count();
    const activeCampaigns = await prisma.campaign.count({ where: { status: 'ACTIVE' } });
    const totalBuses = await prisma.bus.count();
    const totalAdvertisers = await prisma.advertiser.count();
    const totalImpressions = await prisma.impression.count();
    const totalRevenue = await prisma.campaign.aggregate({
      _sum: { budget: true },
    });

    return {
      totalCampaigns,
      activeCampaigns,
      totalBuses,
      totalAdvertisers,
      totalImpressions,
      revenue: totalRevenue._sum.budget || 0,
    };
  },
};
