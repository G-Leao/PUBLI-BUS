import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/impressionController.js";

const router = Router();

// Registro de exibição pode ser feito por qualquer usuário autenticado
// (futuramente o Player enviará o token do tablet).
router.post(
  "/",
  requireRole("ADMIN", "OPERATOR", "ADVERTISER"),
  validate(
    z.object({
      campaignId: z.string().uuid(),
      tabletId: z.string().uuid(),
      durationSeconds: z.coerce.number().int().nonnegative().default(0),
    }),
  ),
  ctrl.create,
);

export default router;