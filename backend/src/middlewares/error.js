import { apiResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === 'ValidationError') {
    return res.status(422).json(
      apiResponse(false, 'Validation error', null, [{ message: err.message }])
    );
  }

  if (err.name === 'ZodError') {
    const errors = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return res.status(422).json(
      apiResponse(false, 'Validation error', null, errors)
    );
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json(
      apiResponse(false, `${field} already exists`)
    );
  }

  return res.status(err.statusCode || 500).json(
    apiResponse(false, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message)
  );
};
