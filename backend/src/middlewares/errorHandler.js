import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { isProduction } from "../config/env.js";

const PRISMA_ERROR_STATUS = {
  P2000: { status: 400, message: "Valor fora do tamanho permitido" },
  P2002: { status: 409, message: "Registro duplicado: valor único já utilizado" },
  P2003: { status: 400, message: "Registro relacionado não encontrado" },
  P2025: { status: 404, message: "Registro não encontrado" },
  P2014: { status: 400, message: "Relação inválida informada" },
};

function handlePrismaError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERROR_STATUS[error.code];
    if (mapped) {
      return new AppError(mapped.message, mapped.status);
    }
    return new AppError("Erro no banco de dados", 400);
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError("Dados enviados não correspondem ao schema", 422);
  }
  if (error?.name === "NotFoundError") {
    return new AppError("Registro não encontrado", 404);
  }
  if (error?.code === "P2025") {
    return new AppError("Registro não encontrado", 404);
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  let err = error;

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Dados inválidos",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const prismaMapped = handlePrismaError(err);
  if (prismaMapped) err = prismaMapped;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && err.errors.length ? { errors: err.errors } : {}),
    });
  }

  // Erros de multer
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Arquivo excede o tamanho máximo permitido"
        : "Erro no upload do arquivo";
    return res.status(400).json({ success: false, message });
  }

  console.error("💥 Erro não tratado:", err);
  return res.status(500).json({
    success: false,
    message: "Erro interno do servidor",
    ...(isProduction ? {} : { detail: err.message }),
  });
}