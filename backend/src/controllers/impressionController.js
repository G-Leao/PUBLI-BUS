import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import * as service from "../services/impressionService.js";

export const create = asyncHandler(async (req, res) => {
  const impression = await service.createImpression(req.body);
  ok(res, impression);
});

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listImpressions({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
    campaignId: req.query.campaignId,
    tabletId: req.query.tabletId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    user: req.user,
  });
  ok(res, rows, {
    total,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 100),
  });
});

export const metrics = asyncHandler(async (req, res) => {
  const summary = await service.getMetricsSummary({
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    campaignId: req.query.campaignId,
    tabletId: req.query.tabletId,
    user: req.user,
  });
  ok(res, summary);
});

export const metricsByCampaign = asyncHandler(async (req, res) => {
  const campaign = await import("../services/campaignService.js")
    .then((m) => m.getCampaignById(req.params.id, req.user));
  const summary = await service.getMetricsSummary({
    campaignId: campaign.id,
    user: req.user,
  });
  ok(res, summary);
});