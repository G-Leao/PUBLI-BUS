import { apiResponse } from '../utils/response.js';
import { campaignService } from '../services/campaign.js';
import { impressionService } from '../services/impression.js';
import { impressionSchema } from '../utils/validation.js';

export const impressionController = {
  async create(req, res, next) {
    try {
      const validated = impressionSchema.parse(req.body);
      const impression = await impressionService.create(validated);
      return res.status(201).json(apiResponse(true, 'Impression recorded', impression));
    } catch (error) {
      next(error);
    }
  },

  async list(req, res, next) {
    try {
      const filters = {
        campaignId: req.query.campaignId,
        tabletId: req.query.tabletId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };
      const impressions = await impressionService.list(filters);
      return res.json(apiResponse(true, 'Impressions retrieved', impressions));
    } catch (error) {
      next(error);
    }
  },

  async getCampaignMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const total = await impressionService.totalByCampaign(campaignId);
      const totalDuration = await impressionService.totalDurationByCampaign(campaignId);
      return res.json(apiResponse(true, 'Campaign metrics retrieved', { total, totalDuration }));
    } catch (error) {
      next(error);
    }
  },
};
