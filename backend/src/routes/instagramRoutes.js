const express = require('express');
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

router.post('/connect', instagramController.connectAccount);
router.post('/auto-connect', instagramController.autoConnect);
router.get('/', instagramController.getAllAccounts);
router.delete('/:id', instagramController.disconnectAccount);
router.patch('/:id/bot', instagramController.updateBotSettings);

// --- Manual Tools ---
router.get('/manual/accounts', instagramController.getUserInstagramAccounts);
router.get('/manual/:accountId/media', instagramController.getUserInstagramMedia);
router.get('/manual/:accountId/stats', instagramController.getUserInstagramStats);
router.get('/manual/:accountId/media/:mediaId/comments', instagramController.getUserInstagramComments);
router.post('/manual/comment', instagramController.sendUserInstagramComment);
router.post('/manual/trigger-worker', instagramController.triggerUserInstagramWorker);
router.post('/manual/auto-reply-post', instagramController.aiUserAutoReplyPost);

module.exports = router;
