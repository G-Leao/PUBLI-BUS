import { Router } from 'express';
import { campaignController } from '../controllers/campaign.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', campaignController.list);
router.get('/:id', campaignController.getById);
router.post('/', requireRole('ADMIN', 'OPERATOR', 'ADVERTISER'), campaignController.create);
router.put('/:id', requireRole('ADMIN', 'OPERATOR', 'ADVERTISER'), campaignController.update);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR', 'ADVERTISER'), campaignController.delete);
router.patch('/:id/status', requireRole('ADMIN', 'OPERATOR'), campaignController.updateStatus);

export default router;
