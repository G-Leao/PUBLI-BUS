import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/companyService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listCompanies({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 50),
    search: req.query.search,
    user: req.user,
  });
  ok(res, rows, {
    total,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 50),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const company = await service.getCompanyById(req.params.id, req.user);
  ok(res, company);
});

export const create = asyncHandler(async (req, res) => {
  const company = await service.createCompany(req.body);
  created(res, company);
});

export const update = asyncHandler(async (req, res) => {
  const company = await service.updateCompany(req.params.id, req.body);
  ok(res, company);
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeCompany(req.params.id);
  noContent(res);
});