const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const trafficAnalyticsController = require('../controllers/trafficAnalyticsController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

const router = express.Router();

// Public route for tracking visits
// We don't want to enforce authMiddleware on the track route, but we might want to capture the user if they are logged in.
// So we use a custom relaxed auth middleware or just put the track route BEFORE the global router.use(authMiddleware.protect)
router.post('/track', trafficAnalyticsController.trackVisit);

router.use(authMiddleware.protect);

// Require admin or owner to view analytics
router.use(requireRole('admin'));

router.get('/traffic', trafficAnalyticsController.getTrafficStats);

router.get('/volume', analyticsController.getMessageVolume);
router.get('/credits', analyticsController.getCreditUsage);
router.get('/ai', analyticsController.getAiMetrics);
router.get('/templates', analyticsController.getTemplatePerformance);
router.get('/broadcasts', analyticsController.getBroadcastAnalytics);
router.get('/agents', analyticsController.getAgentPerformance);
router.get('/agency-overview', analyticsController.getAgencyOverview);

module.exports = router;
