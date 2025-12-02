/**
 * Search Routes
 */

import express from 'express';
import { searchByUserId, redirectByUserId, startOtpVerification, verifyOtpCode } from '../controllers/search.controller.js';

const router = express.Router();

// GET /search?userId=AB123
router.get('/', searchByUserId);

// GET /search/redirect?userId=AB123
router.get('/redirect', redirectByUserId);

// POST /search/otp/start
router.post('/otp/start', startOtpVerification);

// POST /search/otp/verify
router.post('/otp/verify', verifyOtpCode);

export default router;


