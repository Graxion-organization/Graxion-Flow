const express = require('express');
const linkedinWebhookController = require('../controllers/linkedinWebhookController');

const router = express.Router();

// LinkedIn requires webhook verification (challenge-response)
router.get('/', linkedinWebhookController.verifyWebhook);

// LinkedIn sends event notifications here
router.post('/', linkedinWebhookController.handleWebhook);

module.exports = router;
