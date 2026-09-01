import { Router } from 'express';
import { companyController } from '../controllers/company.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', companyController.list);
router.get('/:id', companyController.getById);
router.post('/', requireRole('ADMIN', 'OPERATOR'), companyController.create);
router.put('/:id', requireRole('ADMIN', 'OPERATOR'), companyController.update);
router.delete('/:id', requireRole('ADMIN', 'OPERATOR'), companyController.delete);

export default router;
