const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/permissions');

const router = express.Router();

router.use(authMiddleware.protect);

// Require admin or owner to view analytics
router.use(requireRole('admin'));

router.get('/volume', analyticsController.getMessageVolume);
router.get('/credits', analyticsController.getCreditUsage);
router.get('/ai', analyticsController.getAiMetrics);
router.get('/templates', analyticsController.getTemplatePerformance);
router.get('/broadcasts', analyticsController.getBroadcastAnalytics);
router.get('/agents', analyticsController.getAgentPerformance);

module.exports = router;
