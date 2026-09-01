import { Router } from 'express';
import { tabletController } from '../controllers/tablet.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', tabletController.list);
router.get('/:id', tabletController.getById);
router.post('/', requireRole('ADMIN', 'OPERATOR'), tabletController.create);
router.put('/:id', requireRole('ADMIN', 'OPERATOR'), tabletController.update);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR'), tabletController.delete);

export default router;
