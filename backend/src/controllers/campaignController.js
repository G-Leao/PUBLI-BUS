import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/campaignService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listCampaigns({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
    status: req.query.status,
    search: req.query.search,
    user: req.user,
  });
  ok(res, rows, {
    total,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await service.getCampaignById(req.params.id, req.user));
});

export const create = asyncHandler(async (req, res) => {
  created(res, await service.createCampaign(req.body, req.user));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await service.updateCampaign(req.params.id, req.body, req.user));
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeCampaign(req.params.id, req.user);
  noContent(res);
});

export const updateStatus = asyncHandler(async (req, res) => {
  ok(
    res,
    await service.updateCampaignStatus(req.params.id, req.body.status, req.user),
  );
});