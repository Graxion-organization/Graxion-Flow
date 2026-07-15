const express = require('express');
const webhookController = require('../controllers/telegramWebhookController');

const router = express.Router();

router.post('/:botUsername', webhookController.receiveMessage);

module.exports = router;
