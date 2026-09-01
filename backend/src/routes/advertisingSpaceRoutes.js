import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/advertisingSpaceController.js";

const router = Router();

router.use(requireRole("ADMIN", "OPERATOR"));

const baseSchema = {
  busId: z.string().uuid().optional().nullable(),
  name: z.string().min(2, "Nome é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
};

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validate(z.object(baseSchema)), ctrl.create);
router.put("/:id", validate(z.object({ ...baseSchema, name: baseSchema.name.optional() })), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;