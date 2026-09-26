import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/apiResponse.js";
import * as authService from "../services/authService.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser({
    ...req.body,
    name: req.body.name || String(req.body.email).split("@")[0],
  });
  created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.loginUser(req.body);
  ok(res, session);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const session = await authService.verifyEmailOtp(req.body);
  ok(res, session);
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendEmailOtp(req.body);
  ok(res, result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user);
  ok(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  // req.user vem do JWT (authMiddleware); nunca confiamos em ids do body.
  const user = await authService.updateProfile(req.user, req.body);
  ok(res, { user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body);
  ok(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetUserPassword({
    resetToken: req.body.token || req.body.resetToken,
    newPassword: req.body.newPassword,
  });
  ok(res, result);
});