import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

export function signResetToken(userId) {
  return jwt.sign({ sub: userId, purpose: "reset_password" }, env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function verifyResetToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (payload.purpose !== "reset_password") {
    throw new Error("Token de redefinição inválido");
  }
  return payload.sub;
}