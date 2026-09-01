import { prisma } from "../utils/prisma.js";
import { NotFoundError, AppError } from "../utils/AppError.js";
import { getCampaignById } from "./campaignService.js";
import { touchTablet } from "./tabletService.js";

export async function createImpression({ campaignId, tabletId, durationSeconds = 0 }) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Campanha não encontrada");
  if (campaign.status !== "ACTIVE" && campaign.status !== "SCHEDULED") {
    throw new AppError("A campanha não está exibindo publicidade", 409);
  }
  const tablet = await prisma.tablet.findUnique({ where: { id: tabletId } });
  if (!tablet) throw new NotFoundError("Tablet não encontrado");

  const impression = await prisma.impression.create({
    data: {
      campaignId,
      tabletId,
      durationSeconds: Number(durationSeconds) || 0,
      startedAt: new Date(),
    },
  });

  await touchTablet(tabletId).catch(() => {});

  return impression;
}

export async function listImpressions({ page = 1, limit = 100, campaignId, tabletId, startDate, endDate, user }) {
  const where = {};
  if (user.role === "ADVERTISER") {
    where.campaign = { advertiserId: user.advertiser?.id || "__none__" };
  }
  if (campaignId) where.campaignId = campaignId;
  if (tabletId) where.tabletId = tabletId;
  if (startDate || endDate) {
    where.startedAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
  const [rows, total] = await Promise.all([
    prisma.impression.findMany({
      where,
      include: { campaign: true, tablet: { include: { bus: true } } },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.impression.count({ where }),
  ]);
  return { rows, total };
}

export async function getMetricsSummary({ startDate, endDate, campaignId, tabletId, user }) {
  const where = {};
  if (user.role === "ADVERTISER") {
    where.campaign = { advertiserId: user.advertiser?.id || "__none__" };
  }
  if (campaignId) where.campaignId = campaignId;
  if (tabletId) where.tabletId = tabletId;
  if (startDate || endDate) {
    where.startedAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const [totalImpressions, totalDuration, byCampaign, byTablet, byBus, lastDays] =
    await Promise.all([
      prisma.impression.count({ where }),
      prisma.impression.aggregate({ where, _sum: { durationSeconds: true } }),
      prisma.impression.groupBy({
        by: ["campaignId"],
        where,
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      prisma.impression.groupBy({
        by: ["tabletId"],
        where,
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      prisma.impression.groupBy({
        by: ["tabletId"],
        where,
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      prisma.impression.findMany({
        where,
        select: { startedAt: true },
        orderBy: { startedAt: "desc" },
        take: 1000,
      }),
    ]);

  // Impressões por ônibus (resolve tabletId → busId).
  const tablets = await prisma.tablet.findMany({
    where: { id: { in: byBus.map((i) => i.tabletId) } },
    select: { id: true, busId: true, bus: { select: { code: true, line: true } } },
  });
  const tabletBus = Object.fromEntries(tablets.map((t) => [t.id, t.busId]));
  const busMap = new Map();
  for (const item of byBus) {
    const busId = tabletBus[item.tabletId];
    if (!busId) continue;
    const cur = busMap.get(busId) || { busId, count: 0, durationSeconds: 0 };
    cur.count += item._count._all;
    cur.durationSeconds += item._sum.durationSeconds || 0;
    busMap.set(busId, cur);
  }
  const byBusRows = await Promise.all(
    [...busMap.values()].map(async (row) => {
      const bus = await prisma.bus.findUnique({
        where: { id: row.busId },
        select: { id: true, code: true, line: true },
      });
      return { ...row, bus };
    }),
  );

  // Impressões por período (últimos 30 dias).
  const periodMap = new Map();
  const now = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    periodMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const imp of lastDays) {
    const key = imp.startedAt.toISOString().slice(0, 10);
    if (periodMap.has(key)) periodMap.set(key, periodMap.get(key) + 1);
  }

  return {
    totalImpressions,
    totalDurationSeconds: totalDuration._sum.durationSeconds || 0,
    byCampaign: await enrichCampaigns(byCampaign),
    byTablet,
    byBus: byBusRows,
    byPeriod: [...periodMap.entries()].map(([date, count]) => ({ date, count })),
  };
}

async function enrichCampaigns(groups) {
  return Promise.all(
    groups.map(async (g) => {
      const campaign = await prisma.campaign.findUnique({
        where: { id: g.campaignId },
        select: { id: true, name: true, status: true },
      });
      return {
        campaignId: g.campaignId,
        campaign,
        count: g._count._all,
        durationSeconds: g._sum.durationSeconds || 0,
      };
    }),
  );
}