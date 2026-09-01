import { Router } from 'express';
import { advertisingSpaceController } from '../controllers/advertisingSpace.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', advertisingSpaceController.list);
router.get('/:id', advertisingSpaceController.getById);
router.post('/', requireRole('ADMIN', 'OPERATOR'), advertisingSpaceController.create);
router.put('/:id', requireRole('ADMIN', 'OPERATOR'), advertisingSpaceController.update);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR'), advertisingSpaceController.delete);

export default router;
