/**
 * Camada de modelos do backend.
 *
 * Os modelos são definidos no schema do Prisma (`prisma/schema.prisma`) e o
 * client gerado fica disponível via `src/utils/prisma.js`. Este arquivo apenas
 * reexporta os enums de domínio para conveniência dos controllers/services.
 */
export { Prisma, PrismaClient } from "@prisma/client";
export { prisma } from "../utils/prisma.js";

// Enums de domínio (espelham o schema Prisma)
export const UserRole = Object.freeze({
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  ADVERTISER: "ADVERTISER",
});

export const BusStatus = Object.freeze({
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
});

export const AdvertisingSpaceStatus = Object.freeze({
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  MAINTENANCE: "MAINTENANCE",
});

export const CampaignStatus = Object.freeze({
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
});

export const TabletStatus = Object.freeze({
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  MAINTENANCE: "MAINTENANCE",
});