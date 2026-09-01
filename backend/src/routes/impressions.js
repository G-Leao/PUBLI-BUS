import { Router } from 'express';
import { impressionController } from '../controllers/impression.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', impressionController.list);
router.post('/', requireRole('ADMIN', 'OPERATOR'), impressionController.create);
router.get('/campaigns/:campaignId', impressionController.getCampaignMetrics);

export default router;
