/**
 * Users Routes
 */

import express from 'express';
import { listUsers } from '../controllers/user.controller.js';

const router = express.Router();

// GET /users?page=1&limit=10
router.get('/', listUsers);

export default router;


