import { apiResponse } from '../utils/response.js';
import { dashboardService } from '../services/dashboard.js';

export const dashboardController = {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats();
      return res.json(apiResponse(true, 'Dashboard stats retrieved', stats));
    } catch (error) {
      next(error);
    }
  },
};
