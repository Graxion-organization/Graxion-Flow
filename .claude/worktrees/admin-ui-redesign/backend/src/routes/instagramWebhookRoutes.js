const express = require('express');
const instagramWebhookController = require('../controllers/instagramWebhookController');
const { verifyMetaSignature } = require('../middleware/verifyWebhookSignature');

const router = express.Router();

router.get('/', instagramWebhookController.verifyWebhook);
router.post('/', verifyMetaSignature, instagramWebhookController.receiveMessage);

module.exports = router;
