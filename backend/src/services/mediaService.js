import { prisma } from "../utils/prisma.js";
import { NotFoundError, AppError } from "../utils/AppError.js";
import { storageService } from "./storageService.js";
import { getCampaignById } from "./campaignService.js";

export async function listMediaByCampaign(campaignId, user) {
  // Verifica acesso à campanha (lança 404 para ADVERTISER sem permissão).
  await getCampaignById(campaignId, user);
  return prisma.media.findMany({
    where: { campaignId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createMediaFromUpload(campaignId, { file, metadata }, user) {
  await getCampaignById(campaignId, user);

  if (metadata) {
    const { fileName, fileUrl, fileType, fileSize, durationSeconds } = metadata;
    if (!fileUrl) {
      throw new AppError("fileUrl é obrigatório no metadata", 422);
    }
    return prisma.media.create({
      data: {
        campaignId,
        fileName: fileName || "media",
        fileUrl,
        fileType: fileType || "application/octet-stream",
        fileSize: Number(fileSize || 0) || 0,
        durationSeconds: durationSeconds ? Number(durationSeconds) : null,
      },
    });
  }

  if (!file) {
    throw new AppError("Envie um arquivo (campo `file`) ou metadados JSON", 422);
  }

  const stored = await storageService.upload({
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalName: file.originalname,
  });

  return prisma.media.create({
    data: {
      campaignId,
      fileName: stored.fileName,
      fileUrl: stored.fileUrl,
      fileType: stored.fileType,
      fileSize: stored.fileSize,
      durationSeconds: metadata?.durationSeconds
        ? Number(metadata.durationSeconds)
        : null,
    },
  });
}

export async function deleteMedia(id, user) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new NotFoundError("Mídia não encontrada");

  await getCampaignById(media.campaignId, user);

  await storageService.delete(media.fileUrl);
  await prisma.media.delete({ where: { id } });
}