import { Router } from "express";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/reportController.js";

const router = Router();

router.use(requireRole("ADMIN", "OPERATOR", "ADVERTISER"));

router.get("/campaigns", ctrl.campaigns);
router.get("/campaigns/:id", ctrl.campaignDetail);
router.get("/advertisers/:id", ctrl.advertiserReport);

export default router;