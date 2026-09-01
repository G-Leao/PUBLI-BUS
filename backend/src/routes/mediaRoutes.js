import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import { uploadMiddleware, handleUploadError } from "../middlewares/uploadMiddleware.js";
import * as ctrl from "../controllers/mediaController.js";

const router = Router({ mergeParams: true });

router.use(requireRole("ADMIN", "OPERATOR", "ADVERTISER"));

const metadataSchema = z.object({
  fileName: z.string().optional(),
  fileUrl: z.string().url("fileUrl inválido"),
  fileType: z.string().optional(),
  fileSize: z.coerce.number().optional(),
  durationSeconds: z.coerce.number().optional(),
});

router.get("/", ctrl.listByCampaign);
router.post(
  "/",
  uploadMiddleware.single("file"),
  handleUploadError,
  validate(metadataSchema.partial().optional()),
  ctrl.createForCampaign,
);
router.delete("/:mediaId", ctrl.remove);

export default router;