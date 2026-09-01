import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, noContent } from "../utils/apiResponse.js";
import * as service from "../services/userService.js";

export const list = asyncHandler(async (req, res) => {
  const { rows, total } = await service.listUsers({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 50),
    search: req.query.search,
  });
  ok(
    res,
    rows,
    { total, page: Number(req.query.page || 1), limit: Number(req.query.limit || 50) },
  );
});

export const getOne = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  ok(res, user);
});

export const create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body);
  created(res, user);
});

export const update = asyncHandler(async (req, res) => {
  const user = await service.updateUser(req.params.id, req.body, req.user);
  ok(res, user);
});

export const remove = asyncHandler(async (req, res) => {
  await service.removeUser(req.params.id, req.user);
  noContent(res);
});