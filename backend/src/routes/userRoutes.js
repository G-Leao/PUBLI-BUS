import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/userController.js";

const router = Router();

// Operador não pode gerenciar usuários administradores.
router.use(requireRole("ADMIN", "OPERATOR"));

const createSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "OPERATOR", "ADVERTISER"]).default("ADVERTISER"),
  companyId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "OPERATOR", "ADVERTISER"]).optional(),
  companyId: z.string().uuid().optional(),
});

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", requireRole("ADMIN"), validate(createSchema), ctrl.create);
router.put("/:id", validate(updateSchema), ctrl.update);
router.delete("/:id", requireRole("ADMIN"), ctrl.remove);

export default router;