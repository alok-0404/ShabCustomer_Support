/**
 * Branches Routes
 */

import express from 'express';
import { listBranches, createBranch, getBranch, updateBranch, deleteBranch } from '../controllers/branch.controller.js';
import { requireAuth, requireRoot } from '../middlewares/auth.js';

const router = express.Router();

// GET /branches?page=1&limit=10
router.get('/', requireAuth, requireRoot, listBranches);
router.post('/', requireAuth, requireRoot, createBranch);
router.get('/:id', requireAuth, requireRoot, getBranch);
router.put('/:id', requireAuth, requireRoot, updateBranch);
router.delete('/:id', requireAuth, requireRoot, deleteBranch);

export default router;


