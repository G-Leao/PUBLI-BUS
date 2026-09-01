import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/mediaService.js";

export const listByCampaign = asyncHandler(async (req, res) => {
  const media = await service.listMediaByCampaign(req.params.campaignId, req.user);
  ok(res, media);
});

export const createForCampaign = asyncHandler(async (req, res) => {
  const metadata = req.body && Object.keys(req.body).length ? req.body : null;
  const media = await service.createMediaFromUpload(
    req.params.campaignId,
    { file: req.file, metadata },
    req.user,
  );
  created(res, media);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteMedia(req.params.id, req.user);
  noContent(res);
});