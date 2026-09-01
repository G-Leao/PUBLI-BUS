import { apiResponse } from '../utils/response.js';
import prisma from '../config/prisma.js';
import { campaignService } from '../services/campaign.js';
import { campaignSchema } from '../utils/validation.js';

export const campaignController = {
  async list(req, res, next) {
    try {
      let advertiserId = null;
      if (req.user.role === 'ADVERTISER') {
        const advertiser = await prisma.advertiser.findUnique({
          where: { userId: req.user.userId },
        });
        advertiserId = advertiser?.id;
      }
      const campaigns = await campaignService.list(advertiserId);
      return res.json(apiResponse(true, 'Campaigns retrieved', campaigns));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const advertiserId = req.user.role === 'ADVERTISER' ? (await prisma.advertiser.findUnique({ where: { userId: req.user.userId } }))?.id : null;
      const campaign = await campaignService.getById(req.params.id, advertiserId);
      return res.json(apiResponse(true, 'Campaign retrieved', campaign));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = campaignSchema.parse(req.body);
      const campaign = await campaignService.create(validated);
      return res.status(201).json(apiResponse(true, 'Campaign created', campaign));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const validated = campaignSchema.partial().parse(req.body);
      const campaign = await campaignService.update(req.params.id, validated);
      return res.json(apiResponse(true, 'Campaign updated', campaign));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await campaignService.delete(req.params.id);
      return res.json(apiResponse(true, 'Campaign deleted'));
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED'].includes(status)) {
        throw new Error('Invalid status');
      }
      const campaign = await campaignService.updateStatus(req.params.id, status);
      return res.json(apiResponse(true, 'Campaign status updated', campaign));
    } catch (error) {
      next(error);
    }
  },
};
