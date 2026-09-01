import { apiResponse } from '../utils/response.js';
import { authService } from '../services/auth.js';
import { loginSchema, registerSchema } from '../utils/validation.js';

export const authController = {
  async register(req, res, next) {
    try {
      const validated = registerSchema.parse(req.body);
      const user = await authService.register(validated.email, validated.password, validated.name);
      return res.status(201).json(apiResponse(true, 'User registered successfully', user));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated.email, validated.password);
      return res.json(apiResponse(true, 'Login successful', result));
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getUser(req.user.userId);
      return res.json(apiResponse(true, 'User data retrieved', user));
    } catch (error) {
      next(error);
    }
  },
};
