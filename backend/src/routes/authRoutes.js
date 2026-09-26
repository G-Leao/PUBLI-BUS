import { Router } from "express";
import { validate, z } from "../middlewares/validate.js";
import { authLimiter, otpLimiter } from "../middlewares/rateLimit.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import * as ctrl from "../controllers/authController.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADVERTISER"]).optional(),
  companyId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const forgotSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

const otpSchema = z.object({
  email: z.string().email("E-mail inválido"),
  otpCode: z.string().regex(/^\d{6}$/, "O código deve ter 6 dígitos"),
});

const resendOtpSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

const resetSchema = z
  .object({
    token: z.string().min(1).optional(),
    resetToken: z.string().min(1).optional(),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  })
  .refine((v) => v.token || v.resetToken, {
    message: "Token de redefinição é obrigatório",
    path: ["token"],
  });

// Atualização do próprio perfil (só campos seguros; role/plan/email/password
// só podem ser alterados por regras administrativas específicas).
const updateMeSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100)
      .optional(),
    avatarUrl: z
      .string()
      .url("avatarUrl deve ser uma URL válida")
      .max(500)
      .optional()
      .nullable(),
  })
  .refine((v) => v.name !== undefined || v.avatarUrl !== undefined, {
    message: "Envie ao menos um campo para atualizar (name ou avatarUrl)",
    path: ["body"],
  });

// Rate limit mais rígido em endpoints de autenticação
router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
router.get("/me", authMiddleware, ctrl.me);
router.patch("/me", authMiddleware, validate(updateMeSchema), ctrl.updateMe);
router.post("/verify-otp", otpLimiter, validate(otpSchema), ctrl.verifyOtp);
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), ctrl.resendOtp);
router.post("/forgot-password", authLimiter, validate(forgotSchema), ctrl.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetSchema), ctrl.resetPassword);

export default router;