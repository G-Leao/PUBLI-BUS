import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  uploadMiddleware,
  handleUploadError,
} from "../middlewares/uploadMiddleware.js";
import { storageService } from "../services/storageService.js";

const router = Router();

/**
 * POST /api/uploads — armazenamento permanente de mídia.
 * Valida tipo, extensão e tamanho máximo. O banco guarda apenas a URL.
 */
router.post(
  "/",
  authMiddleware,
  uploadMiddleware.single("file"),
  handleUploadError,
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Envie um arquivo (campo `file`)" });
    }
    const stored = await storageService.upload({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });
    return res.status(201).json({ success: true, data: stored });
  },
);

export default router;