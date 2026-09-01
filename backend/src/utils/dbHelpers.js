import { prisma } from "./prisma.js";

/**
 * Verifica unicidade em um modelo Prisma e lança um erro 409 amigável.
 */
export async function conflictCheck(model, where, message) {
  const found = await prisma[model].findFirst({ where });
  if (found) {
    const err = new Error(message);
    err.name = "AppError";
    err.statusCode = 409;
    err.errors = [];
    err.isOperational = true;
    throw err;
  }
}