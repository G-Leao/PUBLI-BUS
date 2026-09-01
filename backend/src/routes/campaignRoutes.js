import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import * as ctrl from "../controllers/campaignController.js";
import mediaRoutes from "./mediaRoutes.js";

const router = Router();

router.use(requireRole("ADMIN", "OPERATOR", "ADVERTISER"));

const relSchema = z.array(z.string().uuid()).optional();

const createSchema = z.object({
  advertiserId: z.string().uuid().optional(),
  name: z.string().min(2, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  budget: z.coerce.number().nonnegative().optional(),
  status: z
    .enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "FINISHED", "CANCELLED"])
    .optional(),
  durationSeconds: z.coerce.number().int().nonnegative().optional(),
  busIds: relSchema,
  spaceIds: relSchema,
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  mediaFileName: z.string().optional().nullable(),
  mediaFileSize: z.coerce.number().optional().nullable(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "FINISHED", "CANCELLED"]),
});

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validate(createSchema), ctrl.create);
router.put("/:id", validate(updateSchema), ctrl.update);
router.delete("/:id", ctrl.remove);
router.patch("/:id/status", validate(statusSchema), ctrl.updateStatus);

router.use("/:campaignId/media", mediaRoutes);

export default router;