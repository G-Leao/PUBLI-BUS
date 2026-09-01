import { apiResponse } from '../utils/response.js';

export const authenticate = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json(apiResponse(false, 'Missing or invalid authorization header'));
    }

    const token = auth.slice(7);
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json(apiResponse(false, 'Invalid or expired token'));
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(apiResponse(false, 'Authentication failed'));
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(apiResponse(false, 'Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(apiResponse(false, 'Insufficient permissions'));
    }

    next();
  };
};
