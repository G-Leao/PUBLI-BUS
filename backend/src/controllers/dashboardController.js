import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import { getDashboard } from "../services/dashboardService.js";

export const getDashboardHandler = asyncHandler(async (req, res) => {
  ok(res, await getDashboard(req.user));
});