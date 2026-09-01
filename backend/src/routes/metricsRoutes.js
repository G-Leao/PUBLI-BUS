import { Router } from "express";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/impressionController.js";

const router = Router();

router.use(requireRole("ADMIN", "OPERATOR", "ADVERTISER"));

router.get("/", ctrl.metrics);
router.get("/campaigns/:id", ctrl.metricsByCampaign);

export default router;