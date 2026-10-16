const express = require('express');
const facebookController = require('../controllers/facebookController');
const facebookWebhookController = require('../controllers/facebookWebhookController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

// Public Meta Data Deletion Callback endpoint
router.post('/data-deletion', facebookWebhookController.handleDataDeletionCallback);
router.get('/data-deletion', (req, res) => {
  const code = req.query.code || 'STATUS_ACTIVE';
  res.redirect(`${process.env.FRONTEND_URL || 'https://flow.graxion.in'}/data-deletion-policy?code=${code}`);
});

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.post('/auto-connect', facebookController.autoConnect);
router.get('/accounts', facebookController.getAllAccounts);
router.patch('/accounts/:id/bot', facebookController.updateBotSettings);
router.delete('/accounts/:id', facebookController.disconnectAccount);

// Manual Automation Hub Endpoints
router.get('/manual/accounts', facebookController.getAllAccounts);
router.get('/manual/:id/stats', facebookController.getStats);
router.get('/manual/:id/media', facebookController.getMedia);
router.get('/manual/:id/media/:mediaId/comments', facebookController.getMediaComments);
router.post('/manual/:id/comments/:commentId/reply', facebookController.replyToComment);
router.post('/manual/trigger-worker', facebookController.triggerWorker);
router.post('/manual/auto-reply-post', facebookController.autoReplyPost);

module.exports = router;
