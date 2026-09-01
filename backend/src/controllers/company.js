import { apiResponse } from '../utils/response.js';
import { companyService } from '../services/company.js';
import { companySchema } from '../utils/validation.js';

export const companyController = {
  async list(req, res, next) {
    try {
      const companies = await companyService.list();
      return res.json(apiResponse(true, 'Companies retrieved', companies));
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const company = await companyService.getById(req.params.id);
      return res.json(apiResponse(true, 'Company retrieved', company));
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const validated = companySchema.parse(req.body);
      const company = await companyService.create(validated);
      return res.status(201).json(apiResponse(true, 'Company created', company));
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const validated = companySchema.partial().parse(req.body);
      const company = await companyService.update(req.params.id, validated);
      return res.json(apiResponse(true, 'Company updated', company));
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await companyService.delete(req.params.id);
      return res.json(apiResponse(true, 'Company deleted'));
    } catch (error) {
      next(error);
    }
  },
};
