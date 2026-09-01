import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError, UnauthorizedError } from "../utils/AppError.js";
import { prisma } from "../utils/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const USER_INCLUDE = {
  advertiser: {
    include: {
      company: true,
    },
  },
};

function extractToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** Exige um token JWT válido. Popula `req.user` com o usuário completo. */
export const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new UnauthorizedError("Não autenticado");

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Token inválido ou expirado");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: USER_INCLUDE,
  });
  if (!user) throw new UnauthorizedError("Usuário não encontrado");

  req.user = user;
  req.tokenPayload = payload;
  next();
});

/** Autentica se houver token, mas não bloqueia requisições anônimas. */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: USER_INCLUDE,
    });
    if (user) req.user = user;
  } catch {
    // token inválido → segue como anônimo
  }
  next();
});

/** Previne acesso a recursos falsificando o id do próprio usuário. */
export function assertSelfOrRole(req, targetUserId, ...roles) {
  if (req.user.id === targetUserId) return;
  if (!roles.includes(req.user.role)) {
    throw new AppError("Acesso negado: permissão insuficiente", 403);
  }
}