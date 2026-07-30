const express = require('express');
const youtubeController = require('../controllers/youtubeController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.get('/auth-url', youtubeController.getAuthUrl);
router.post('/callback', youtubeController.callback);
router.post('/disconnect', youtubeController.disconnect);

// Automation Routes
const automationController = require('../controllers/youtubeAutomationController');
router.get('/automation/settings', automationController.getSettings);
router.patch('/automation/settings', automationController.updateSettings);
router.get('/automation/pending', automationController.getPendingComments);
router.get('/automation/history', automationController.getHistory);
router.post('/automation/approve', automationController.approveReply);
router.post('/automation/ignore', automationController.ignoreComment);
// Manual Automation Hub Endpoints
router.get('/manual/accounts', youtubeController.getAllAccounts);
router.get('/manual/:id/stats', youtubeController.getStats);
router.get('/manual/:id/media', youtubeController.getMedia);
router.get('/manual/:id/media/:mediaId/comments', youtubeController.getMediaComments);
router.post('/manual/:id/comments/:commentId/reply', youtubeController.replyToComment);
router.post('/manual/trigger-worker', youtubeController.triggerWorker);
router.post('/manual/auto-reply-post', youtubeController.autoReplyPost);

module.exports = router;
