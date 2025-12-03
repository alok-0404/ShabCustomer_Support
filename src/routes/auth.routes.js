import express from 'express';
import { login, me, logout, changePassword, changeEmail, forgotPassword, resetPassword, firstTimeChangePassword } from '../controllers/auth.controller.js';
import { apiRateLimit } from '../middlewares/rateLimit.js';
import { requireAuth, requireRoot } from '../middlewares/auth.js';

const router = express.Router();

// Public endpoints (no auth required)
router.post('/login', apiRateLimit, login);
router.post('/forgot-password', apiRateLimit, forgotPassword);
router.post('/reset-password', apiRateLimit, resetPassword);

// Protected endpoints (auth required)
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.post('/first-change-password', requireAuth, firstTimeChangePassword);
router.post('/change-password', requireAuth, requireRoot, changePassword);
router.post('/change-email', requireAuth, requireRoot, changeEmail);

export default router;


