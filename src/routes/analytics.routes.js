/**
 * Analytics Routes
 * Provides client visit analytics for admin dashboard
 */

import express from 'express';
import { requireAuth, requireSubAdminOrRoot } from '../middlewares/auth.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get detailed client visit analytics
router.get('/client-visits', requireSubAdminOrRoot, analyticsController.getClientVisitAnalytics);

// Get paginated visit logs
router.get('/visit-logs', requireSubAdminOrRoot, analyticsController.getVisitLogs);

// Get real-time statistics
router.get('/realtime-stats', requireSubAdminOrRoot, analyticsController.getRealtimeStats);

export default router;
