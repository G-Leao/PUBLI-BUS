import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/advertiserService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listAdvertisers({
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
  const advertiser = await service.getAdvertiserById(req.params.id, req.user);
  ok(res, advertiser);
});

export const create = asyncHandler(async (req, res) => {
  const result = await service.createAdvertiser(req.body);
  created(res, result.advertiser);
});

export const update = asyncHandler(async (req, res) => {
  const advertiser = await service.updateAdvertiser(req.params.id, req.body);
  ok(res, advertiser);
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeAdvertiser(req.params.id);
  noContent(res);
});