import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/busController.js";

const router = Router();

router.use(requireRole("ADMIN", "OPERATOR"));

const baseSchema = {
  code: z.string().min(1, "Código é obrigatório"),
  plate: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  line: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).optional(),
};

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validate(z.object(baseSchema)), ctrl.create);
router.put("/:id", validate(z.object({ ...baseSchema, code: baseSchema.code.optional() })), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;