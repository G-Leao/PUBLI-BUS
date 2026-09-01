import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/advertiserController.js";

const router = Router();

// ADVERTISER vê somente o próprio registro (no service).
router.get("/", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), ctrl.list);
router.get("/:id", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), ctrl.getOne);

const createSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
});

const updateSchema = createSchema.partial();

router.post("/", requireRole("ADMIN", "OPERATOR"), validate(createSchema), ctrl.create);
router.put("/:id", requireRole("ADMIN", "OPERATOR"), validate(updateSchema), ctrl.update);
router.delete("/:id", requireRole("ADMIN", "OPERATOR"), ctrl.remove);

export default router;