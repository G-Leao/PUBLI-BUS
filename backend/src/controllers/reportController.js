import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import * as service from "../services/reportService.js";

export const campaigns = asyncHandler(async (req, res) => {
  const data = await service.getCampaignReport(req.user, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    campaignId: req.query.campaignId,
    advertiserId: req.query.advertiserId,
    busId: req.query.busId,
  });
  ok(res, data);
});

export const campaignDetail = asyncHandler(async (req, res) => {
  const data = await service.getCampaignReportById(req.params.id, req.user);
  ok(res, data);
});

export const advertiserReport = asyncHandler(async (req, res) => {
  const data = await service.getAdvertiserReport(req.params.id, req.user);
  ok(res, data);
});