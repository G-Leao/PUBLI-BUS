import { AppError, UnauthorizedError } from "../utils/AppError.js";

/**
 * Autorização por papel (RBAC).
 * Ex.: requireRole("ADMIN"), requireRole("ADMIN", "OPERATOR")
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new UnauthorizedError("Não autenticado"));
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError("Acesso negado: permissão insuficiente", 403),
    );
  }
  return next();
};