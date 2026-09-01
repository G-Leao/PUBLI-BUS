import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/busService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listBuses({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
    search: req.query.search,
    status: req.query.status,
  });
  ok(res, rows, {
    total,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getBusById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await service.createBus(req.body));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateBus(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeBus(req.params.id);
  noContent(res);
});