import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import companyRoutes from "./companyRoutes.js";
import advertiserRoutes from "./advertiserRoutes.js";
import busRoutes from "./busRoutes.js";
import advertisingSpaceRoutes from "./advertisingSpaceRoutes.js";
import campaignRoutes from "./campaignRoutes.js";
import tabletRoutes from "./tabletRoutes.js";
import metricsRoutes from "./metricsRoutes.js";
import impressionRoutes from "./impressionRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import reportRoutes from "./reportRoutes.js";
import mediaDeleteRoutes from "./mediaDeleteRoutes.js";
import uploadRoutes from "./uploadsRoutes.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// Público
router.use(healthRoutes);

// Autenticação
router.use("/auth", authRoutes);

// Rotas com autenticação obrigatória
router.use(authMiddleware);
router.use("/users", userRoutes);
router.use("/companies", companyRoutes);
router.use("/advertisers", advertiserRoutes);
router.use("/buses", busRoutes);
router.use("/advertising-spaces", advertisingSpaceRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/tablets", tabletRoutes);
router.use("/metrics", metricsRoutes);
router.use("/impressions", impressionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/media", mediaDeleteRoutes);
router.use("/uploads", uploadRoutes);

export default router;