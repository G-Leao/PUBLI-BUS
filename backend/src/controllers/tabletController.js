import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/tabletService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listTablets({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
    status: req.query.status,
    search: req.query.search,
  });
  ok(res, rows, {
    total,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getTabletById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await service.createTablet(req.body));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateTablet(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeTablet(req.params.id);
  noContent(res);
});