import express from 'express';
import { requireAuth, requireRoot } from '../middlewares/auth.js';
import { apiRateLimit } from '../middlewares/rateLimit.js';
import { createSubAdmin, listSubAdmins, updateSubAdmin, resetSubAdminPassword, deactivateSubAdmin } from '../controllers/admin.controller.js';

const router = express.Router();

router.use(requireAuth, requireRoot);

router.post('/', apiRateLimit, createSubAdmin);
router.get('/', listSubAdmins);
router.put('/:id', updateSubAdmin);
router.post('/:id/reset-password', resetSubAdminPassword);
router.delete('/:id', deactivateSubAdmin);

export default router;


