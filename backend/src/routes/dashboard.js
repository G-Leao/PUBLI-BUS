import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN', 'OPERATOR'));

router.get('/', dashboardController.getStats);

export default router;
