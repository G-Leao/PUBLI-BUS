import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const generateToken = (userId, userRole) => {
  return jwt.sign(
    { userId, role: userRole },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};
