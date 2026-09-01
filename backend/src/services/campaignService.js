import { prisma } from "../utils/prisma.js";
import { NotFoundError, AppError } from "../utils/AppError.js";

const CAMPAIGN_INCLUDE = {
  advertiser: {
    include: {
      company: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  media: { orderBy: { createdAt: "asc" } },
  campaignBuses: { include: { bus: true } },
  campaignSpaces: { include: { advertisingSpace: true } },
  _count: { select: { impressions: true } },
};

function normalize(payload) {
  const { budget, ...rest } = payload;
  return {
    ...rest,
    ...(budget !== undefined ? { budget: String(budget) } : {}),
  };
}

/** Escopo/Autorização: ADVERTISER só acessa as próprias campanhas. */
export function assertCampaignAccess(campaign, user, { action = "acessar" } = {}) {
  if (user.role === "ADVERTISER" && campaign.advertiserId !== user.advertiser?.id) {
    throw new NotFoundError(
      `Campanha não encontrada ou você não tem permissão para ${action} esta campanha`,
    );
  }
}

export async function listCampaigns({ page = 1, limit = 100, status, search, user }) {
  const where = {};
  if (user.role === "ADVERTISER") {
    where.advertiserId = user.advertiser?.id || "__none__";
  }
  if (status) where.status = status;
  if (search) {
    where.OR = [{ name: { contains: search, mode: "insensitive" } }];
  }
  const [rows, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: CAMPAIGN_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);
  return { rows, total };
}

export async function getCampaignById(id, user) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: CAMPAIGN_INCLUDE,
  });
  if (!campaign) throw new NotFoundError("Campanha não encontrada");
  assertCampaignAccess(campaign, user);
  return campaign;
}

export async function createCampaign(data, user) {
  let advertiserId = data.advertiserId;
  if (user.role === "ADVERTISER") {
    advertiserId = user.advertiser?.id;
    if (!advertiserId) {
      throw new AppError("Seu usuário não está vinculado a um anunciante", 403);
    }
  }
  const advertiser = await prisma.advertiser.findUnique({
    where: { id: advertiserId },
  });
  if (!advertiser) throw new NotFoundError("Anunciante não encontrado");

  const payload = normalize(data);
  const {
    busIds,
    spaceIds,
    mediaUrl,
    mediaType,
    mediaFileName,
    mediaFileSize,
    ...rest
  } = payload;

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        ...rest,
        advertiserId,
        budget: rest.budget ?? "0",
        durationSeconds: Number(rest.durationSeconds ?? 0) || 0,
        ...(busIds?.length
          ? {
              campaignBuses: {
                create: busIds.map((busId) => ({ busId })),
              },
            }
          : {}),
        ...(spaceIds?.length
          ? {
              campaignSpaces: {
                create: spaceIds.map((advertisingSpaceId) => ({
                  advertisingSpaceId,
                })),
              },
            }
          : {}),
      },
    });

    if (mediaUrl) {
      await tx.media.create({
        data: {
          campaignId: created.id,
          fileName: mediaFileName || "media",
          fileUrl: mediaUrl,
          fileType: mediaType || inferType(mediaUrl),
          fileSize: Number(mediaFileSize ?? 0) || 0,
        },
      });
    }
    return created;
  });

  return getCampaignById(campaign.id, user);
}

export async function updateCampaign(id, data, user) {
  const campaign = await getCampaignById(id, user);
  const payload = normalize(data);
  const {
    advertiserId,
    busIds,
    spaceIds,
    mediaUrl,
    mediaType,
    mediaFileName,
    mediaFileSize,
    ...rest
  } = payload;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.campaign.update({
      where: { id },
      data: {
        ...rest,
        ...(advertiserId && user.role !== "ADVERTISER" ? { advertiserId } : {}),
        ...(rest.budget !== undefined ? { budget: rest.budget } : {}),
      },
    });

    if (busIds) {
      await tx.campaignBus.deleteMany({ where: { campaignId: id } });
      await tx.campaignBus.createMany({
        data: busIds.map((busId) => ({ campaignId: id, busId })),
      });
    }
    if (spaceIds) {
      await tx.campaignSpace.deleteMany({ where: { campaignId: id } });
      await tx.campaignSpace.createMany({
        data: spaceIds.map((advertisingSpaceId) => ({
          campaignId: id,
          advertisingSpaceId,
        })),
      });
    }

    // Sync de mídia única (compatibilidade com telas que usam media_url).
    if (mediaUrl !== undefined) {
      const existingMedia = await tx.media.findFirst({
        where: { campaignId: id },
        orderBy: { createdAt: "asc" },
      });
      if (mediaUrl) {
        const dataMedia = {
          campaignId: id,
          fileName: mediaFileName || "media",
          fileUrl: mediaUrl,
          fileType: mediaType || inferType(mediaUrl),
          fileSize: Number(mediaFileSize ?? 0) || 0,
        };
        if (existingMedia) {
          await tx.media.update({
            where: { id: existingMedia.id },
            data: dataMedia,
          });
        } else {
          await tx.media.create({ data: dataMedia });
        }
      } else if (existingMedia) {
        await tx.media.delete({ where: { id: existingMedia.id } });
      }
    }

    return result;
  });

  return getCampaignById(updated.id, user);
}

export async function removeCampaign(id, user) {
  const campaign = await getCampaignById(id, user);
  await prisma.campaign.delete({ where: { id: campaign.id } });
}

const CAMPAIGN_TRANSITIONS = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED"],
  SCHEDULED: ["ACTIVE", "PAUSED", "CANCELLED"],
  ACTIVE: ["PAUSED", "FINISHED", "CANCELLED"],
  PAUSED: ["ACTIVE", "FINISHED", "CANCELLED"],
  FINISHED: [],
  CANCELLED: [],
};

export async function updateCampaignStatus(id, status, user) {
  const campaign = await getCampaignById(id, user);
  const allowed = CAMPAIGN_TRANSITIONS[campaign.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Transição de status inválida: ${campaign.status} → ${status}`,
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({ where: { id }, data: { status } });

    // Mantém os espaços coerentes com o ciclo de vida da campanha.
    if (status === "ACTIVE" || status === "SCHEDULED") {
      const spaces = await tx.campaignSpace.findMany({
        where: { campaignId: id },
      });
      await Promise.all(
        spaces.map((s) =>
          tx.advertisingSpace.update({
            where: { id: s.advertisingSpaceId },
            data: { status: "OCCUPIED" },
          }),
        ),
      );
    }
    if (status === "FINISHED" || status === "CANCELLED") {
      const spaces = await tx.campaignSpace.findMany({
        where: { campaignId: id },
      });
      await Promise.all(
        spaces.map((s) =>
          tx.advertisingSpace.update({
            where: { id: s.advertisingSpaceId },
            data: { status: "AVAILABLE" },
          }),
        ),
      );
    }
  });

  return getCampaignById(id, user);
}

export { CAMPAIGN_INCLUDE };

function inferType(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.endsWith(".mp4") || lower.includes("/video")) return "video/mp4";
  return "image/jpeg";
}