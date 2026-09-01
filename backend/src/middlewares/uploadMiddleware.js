import multer from "multer";
import { env } from "../config/env.js";
import {
  ALLOWED_MIME,
  assertAllowedFile,
} from "../services/storageService.js";

const maxSize = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = assertAllowedFile(file.mimetype, file.originalname);
  if (!allowed.ok) {
    const error = new Error(allowed.message);
    error.statusCode = 400;
    error.name = "UploadValidationError";
    return cb(error);
  }
  return cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: maxSize, files: 1 },
  fileFilter,
});

/** Middleware para erros de upload que respeita o errorHandler. */
export function handleUploadError(err, req, res, next) {
  if (err && (err.name === "MulterError" || err.name === "UploadValidationError")) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
  return next(err);
}

export const ALLOWED_UPLOAD_MIME = ALLOWED_MIME;