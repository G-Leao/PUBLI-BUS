import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/companyController.js";

const router = Router();

// Leitura: ADMIN/OPERATOR; ADVERTISER vê somente a própria empresa (no service).
router.get("/", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), ctrl.list);
router.get("/:id", requireRole("ADMIN", "OPERATOR", "ADVERTISER"), ctrl.getOne);

const baseSchema = {
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().min(1).optional().nullable(),
  email: z.string().email("E-mail inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
};

const createSchema = z.object(baseSchema);
const updateSchema = z.object({
  ...baseSchema,
  name: baseSchema.name.optional(),
});

router.post("/", requireRole("ADMIN", "OPERATOR"), validate(createSchema), ctrl.create);
router.put("/:id", requireRole("ADMIN", "OPERATOR"), validate(updateSchema), ctrl.update);
router.delete("/:id", requireRole("ADMIN", "OPERATOR"), ctrl.remove);

export default router;