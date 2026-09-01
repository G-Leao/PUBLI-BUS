import { Router } from 'express';
import { apiResponse } from '../utils/response.js';

const router = Router();

router.get('/health', (req, res) => {
  return res.json(apiResponse(true, 'Service is healthy', { service: 'PUBLI-BUS API' }));
});

export default router;
