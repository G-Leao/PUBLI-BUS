import { prisma } from "../utils/prisma.js";

/**
 * Totais do dashboard calculados diretamente do banco.
 * Para ADVERTISER, os totais são limitados aos dados do próprio anunciante.
 */
export async function getDashboard(user) {
  const isAdvertiser = user.role === "ADVERTISER";

  const campaignWhere = isAdvertiser
    ? { advertiserId: user.advertiser?.id || "__none__" }
    : {};

  const [totalCampaigns, activeCampaigns, totalBuses, totalAdvertisers, totalImpressions, revenueAgg] =
    await Promise.all([
      prisma.campaign.count({ where: campaignWhere }),
      prisma.campaign.count({
        where: { ...campaignWhere, status: "ACTIVE" },
      }),
      prisma.bus.count(),
      prisma.advertiser.count(),
      prisma.impression.count({
        where: isAdvertiser
          ? { campaign: { advertiserId: user.advertiser?.id || "__none__" } }
          : {},
      }),
      prisma.campaign.aggregate({
        where: {
          ...campaignWhere,
          status: { in: ["ACTIVE", "SCHEDULED", "FINISHED"] },
        },
        _sum: { budget: true },
      }),
    ]);

  return {
    totalCampaigns,
    activeCampaigns,
    totalBuses: isAdvertiser ? 0 : totalBuses,
    totalAdvertisers: isAdvertiser ? (user.advertiser ? 1 : 0) : totalAdvertisers,
    totalImpressions,
    revenue: Number(revenueAgg._sum.budget || 0),
  };
}