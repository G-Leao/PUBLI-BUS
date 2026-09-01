import { apiResponse } from '../utils/response.js';
import prisma from '../config/prisma.js';
import { tabletSchema } from '../utils/validation.js';

export const tabletController = {
  async list(req, res, next) {
    try {
      const tablets = await prisma.tablet.findMany({ include: { bus: true } });
      return res.json(apiResponse(true, 'Tablets retrieved', tablets));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const tablet = await prisma.tablet.findUnique({
        where: { id: req.params.id },
        include: { bus: true, impressions: true },
      });
      if (!tablet) throw new Error('Tablet not found');
      return res.json(apiResponse(true, 'Tablet retrieved', tablet));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = tabletSchema.parse(req.body);
      const tablet = await prisma.tablet.create({
        data: validated,
        include: { bus: true },
      });
      return res.status(201).json(apiResponse(true, 'Tablet created', tablet));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const validated = tabletSchema.partial().parse(req.body);
      const tablet = await prisma.tablet.update({
        where: { id: req.params.id },
        data: { ...validated, lastSeenAt: new Date() },
        include: { bus: true },
      });
      return res.json(apiResponse(true, 'Tablet updated', tablet));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await prisma.tablet.delete({ where: { id: req.params.id } });
      return res.json(apiResponse(true, 'Tablet deleted'));
    } catch (error) {
      next(error);
    }
  },
};
