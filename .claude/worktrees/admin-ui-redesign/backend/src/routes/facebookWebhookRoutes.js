const express = require('express');
const facebookWebhookController = require('../controllers/facebookWebhookController');
const { verifyMetaSignature } = require('../middleware/verifyWebhookSignature');

const router = express.Router();

router.get('/', facebookWebhookController.verifyWebhook);
router.post('/', verifyMetaSignature, facebookWebhookController.receiveMessage);

module.exports = router;
