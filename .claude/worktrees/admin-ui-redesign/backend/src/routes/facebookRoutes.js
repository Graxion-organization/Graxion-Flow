const express = require('express');
const facebookController = require('../controllers/facebookController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

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
