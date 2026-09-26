import { AppError } from "../utils/AppError.js";
import { isAuthDevMode } from "../config/env.js";

/**
 * Servicio de e-mail de PUBLI-BUS.
 *
 * En modo desarrollo (AUTH_DEV_MODE=true) los códigos/links se escriben en la
 * consola del backend (sin necesidad de proveedor SMTP).
 *
 * En producción (AUTH_DEV_MODE=false) se requiere un proveedor real. Como aún
 * no hay integración configurada, `send*` lanza 503: el endpoint NO expone
 * OTP ni token, y la operación falla de forma explícita en lugar de fingir.
 *
 * Para conectar un proveedor real úsese esta misma interfaz (por exemplo,
 * un driver SMTP/Resend/Postmark) detrás de estas funciones.
 */
function devLog(label, content) {
  console.log(`📧 [AUTH_DEV_MODE] ${label}: ${content}`);
}

export const emailService = {
  async sendVerificationOtp(user, otp) {
    if (isAuthDevMode()) {
      devLog(`Código de verificación para ${user.email}`, otp);
      return;
    }
    throw new AppError(
      "Servicio de e-mail no configurado. Configure un proveedor de e-mail para producción.",
      503,
    );
  },

  async sendPasswordResetLink(user, resetLink) {
    if (isAuthDevMode()) {
      devLog(`Link de recuperación para ${user.email}`, resetLink);
      return;
    }
    throw new AppError(
      "Servicio de e-mail no configurado. Configure un proveedor de e-mail para producción.",
      503,
    );
  },
};