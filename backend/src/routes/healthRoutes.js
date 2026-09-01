import { Router } from "express";
import { prisma } from "../utils/prisma.js";

const router = Router();

/**
 * Health check da API. Verifica também a conexão com o banco.
 */
router.get("/health", async (req, res) => {
  let database = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  const status = database === "connected" ? "ok" : "degraded";
  res.status(database === "connected" ? 200 : 503).json({
    status,
    service: "PUBLI-BUS API",
    database,
    timestamp: new Date().toISOString(),
  });
});

export default router;