import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/apiResponse.js";
import * as authService from "../services/authService.js";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser({
    ...req.body,
    name: req.body.name || String(req.body.email).split("@")[0],
  });
  // Auto-login após cadastro (fluxo compatível com a verificação OTP do front).
  const session = await authService.loginUser({
    email: req.body.email,
    password: req.body.password,
  });
  created(res, { user: session.user, token: session.token });
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.loginUser(req.body);
  ok(res, session);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user);
  ok(res, { user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.createPasswordResetToken(req.body);
  ok(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetUserPassword({
    resetToken: req.body.token || req.body.resetToken,
    newPassword: req.body.newPassword,
  });
  ok(res, result);
});