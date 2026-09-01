import { apiResponse } from '../utils/response.js';
import prisma from '../config/prisma.js';
import { mediaSchema } from '../utils/validation.js';

export const mediaController = {
  async list(req, res, next) {
    try {
      const { campaignId } = req.params;
      const media = await prisma.media.findMany({ where: { campaignId }, include: { campaign: true } });
      return res.json(apiResponse(true, 'Media retrieved', media));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = mediaSchema.parse(req.body);
      const media = await prisma.media.create({
        data: validated,
        include: { campaign: true },
      });
      return res.status(201).json(apiResponse(true, 'Media created', media));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await prisma.media.delete({ where: { id: req.params.id } });
      return res.json(apiResponse(true, 'Media deleted'));
    } catch (error) {
      next(error);
    }
  },
};
