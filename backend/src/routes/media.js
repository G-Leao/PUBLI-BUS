import { Router } from 'express';
import { mediaController } from '../controllers/media.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:campaignId/media', mediaController.list);
router.post('/:campaignId/media', requireRole('ADMIN', 'OPERATOR', 'ADVERTISER'), mediaController.create);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR', 'ADVERTISER'), mediaController.delete);

export default router;
