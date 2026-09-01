import { Router } from "express";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/mediaController.js";

const router = Router();

router.delete("/:id", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), ctrl.remove);

export default router;