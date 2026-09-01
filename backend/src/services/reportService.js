import { prisma } from "../utils/prisma.js";
import { NotFoundError } from "../utils/AppError.js";

export function scopeByUser(user) {
  return user.role === "ADVERTISER"
    ? { advertiserId: user.advertiser?.id || "__none__" }
    : {};
}

export async function getCampaignReport(user, { startDate, endDate, campaignId, advertiserId, busId }) {
  const campaignWhere = {
    ...scopeByUser(user),
    ...(campaignId ? { id: campaignId } : {}),
    ...(advertiserId && user.role !== "ADVERTISER" ? { advertiserId } : {}),
    ...(startDate || endDate
      ? {
          startDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const campaigns = await prisma.campaign.findMany({
    where: campaignWhere,
    include: {
      advertiser: { include: { company: true, user: { select: { id: true, name: true, email: true } } } },
      media: { select: { id: true, fileUrl: true, fileType: true, fileSize: true } },
      campaignBuses: { include: { bus: true } },
      campaignSpaces: { include: { advertisingSpace: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const impressionsWhere = {
    ...(campaignId ? { campaignId } : {}),
    ...(busId ? { tablet: { busId } } : {}),
    ...(startDate || endDate
      ? {
          startedAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  // Agrupa impressões por campanha em um único round-trip.
  const impressions = await prisma.impression.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaigns.map((c) => c.id) }, ...impressionsWhere },
    _count: { _all: true },
    _sum: { durationSeconds: true },
  });
  const aggByCampaign = Object.fromEntries(
    impressions.map((i) => [
      i.campaignId,
      { impressions: i._count._all, totalDurationSeconds: i._sum.durationSeconds || 0 },
    ]),
  );

  return campaigns.map((c) => ({
    ...c,
    report: {
      impressions: aggByCampaign[c.id]?.impressions || 0,
      totalDurationSeconds: aggByCampaign[c.id]?.totalDurationSeconds || 0,
    },
  }));
}

export async function getCampaignReportById(id, user) {
  const report = await getCampaignReport(user, { campaignId: id });
  if (!report.length) throw new NotFoundError("Campanha não encontrada");
  const campaign = report[0];

  const daily = await prisma.impression.groupBy({
    by: ["startedAt"],
    where: { campaignId: id },
    _count: { _all: true },
    _sum: { durationSeconds: true },
  });
  const perDay = new Map();
  for (const item of daily) {
    const key = item.startedAt.toISOString().slice(0, 10);
    const cur = perDay.get(key) || { date: key, impressions: 0, durationSeconds: 0 };
    cur.impressions += item._count._all;
    cur.durationSeconds += item._sum.durationSeconds || 0;
    perDay.set(key, cur);
  }

  return {
    campaign,
    report: campaign.report,
    daily: [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getAdvertiserReport(id, user) {
  if (user.role === "ADVERTISER" && user.advertiser?.id !== id) {
    throw new NotFoundError("Anunciante não encontrado");
  }
  const advertiser = await prisma.advertiser.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      company: true,
      campaigns: {
        include: { media: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!advertiser) throw new NotFoundError("Anunciante não encontrado");

  const ids = advertiser.campaigns.map((c) => c.id);
  const impressions = await prisma.impression.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: ids } },
    _count: { _all: true },
    _sum: { durationSeconds: true },
  });
  const aggByCampaign = Object.fromEntries(
    impressions.map((i) => [
      i.campaignId,
      { impressions: i._count._all, totalDurationSeconds: i._sum.durationSeconds || 0 },
    ]),
  );

  const campaigns = advertiser.campaigns.map((c) => ({
    ...c,
    report: {
      impressions: aggByCampaign[c.id]?.impressions || 0,
      totalDurationSeconds: aggByCampaign[c.id]?.totalDurationSeconds || 0,
    },
  }));

  return {
    id: advertiser.id,
    name: advertiser.company?.name || advertiser.user?.name,
    company: advertiser.company,
    user: advertiser.user,
    campaignCount: campaigns.length,
    totalImpressions: campaigns.reduce((s, c) => s + c.report.impressions, 0),
    totalDurationSeconds: campaigns.reduce(
      (s, c) => s + c.report.totalDurationSeconds,
      0,
    ),
    campaigns,
  };
}