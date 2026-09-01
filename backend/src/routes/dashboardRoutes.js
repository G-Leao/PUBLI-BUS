import { Router } from "express";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import { getDashboardHandler } from "../controllers/dashboardController.js";

const router = Router();

router.get("/", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), getDashboardHandler);

export default router;