import { apiResponse } from '../utils/response.js';
import prisma from '../config/prisma.js';
import { busSchema } from '../utils/validation.js';
import { busService } from '../services/bus.js';

export const busController = {
  async list(req, res, next) {
    try {
      const buses = await busService.list();
      return res.json(apiResponse(true, 'Buses retrieved', buses));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const bus = await busService.getById(req.params.id);
      return res.json(apiResponse(true, 'Bus retrieved', bus));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = busSchema.parse(req.body);
      const bus = await busService.create(validated);
      return res.status(201).json(apiResponse(true, 'Bus created', bus));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const validated = busSchema.partial().parse(req.body);
      const bus = await busService.update(req.params.id, validated);
      return res.json(apiResponse(true, 'Bus updated', bus));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await busService.delete(req.params.id);
      return res.json(apiResponse(true, 'Bus deleted'));
    } catch (error) {
      next(error);
    }
  },
};
