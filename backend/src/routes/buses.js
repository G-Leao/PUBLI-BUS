import { Router } from 'express';
import { busController } from '../controllers/bus.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', busController.list);
router.get('/:id', busController.getById);
router.post('/', requireRole('ADMIN', 'OPERATOR'), busController.create);
router.put('/:id', requireRole('ADMIN', 'OPERATOR'), busController.update);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR'), busController.delete);

export default router;
