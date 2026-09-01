import { apiResponse } from '../utils/response.js';
import prisma from '../config/prisma.js';
import { advertisingSpaceSchema } from '../utils/validation.js';

export const advertisingSpaceController = {
  async list(req, res, next) {
    try {
      const spaces = await prisma.advertisingSpace.findMany({ include: { bus: true } });
      return res.json(apiResponse(true, 'Advertising spaces retrieved', spaces));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const space = await prisma.advertisingSpace.findUnique({
        where: { id: req.params.id },
        include: { bus: true },
      });
      if (!space) throw new Error('Advertising space not found');
      return res.json(apiResponse(true, 'Advertising space retrieved', space));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = advertisingSpaceSchema.parse(req.body);
      const space = await prisma.advertisingSpace.create({
        data: validated,
        include: { bus: true },
      });
      return res.status(201).json(apiResponse(true, 'Advertising space created', space));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const validated = advertisingSpaceSchema.partial().parse(req.body);
      const space = await prisma.advertisingSpace.update({
        where: { id: req.params.id },
        data: validated,
        include: { bus: true },
      });
      return res.json(apiResponse(true, 'Advertising space updated', space));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await prisma.advertisingSpace.delete({ where: { id: req.params.id } });
      return res.json(apiResponse(true, 'Advertising space deleted'));
    } catch (error) {
      next(error);
    }
  },
};
