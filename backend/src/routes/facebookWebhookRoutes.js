const express = require('express');
const facebookWebhookController = require('../controllers/facebookWebhookController');
const { verifyMetaSignature } = require('../middleware/verifyWebhookSignature');

const router = express.Router();

router.get('/', facebookWebhookController.verifyWebhook);
router.post('/', verifyMetaSignature, facebookWebhookController.receiveMessage);

// Official Meta Data Deletion Callback endpoint
router.post('/data-deletion', facebookWebhookController.handleDataDeletionCallback);
router.get('/data-deletion', (req, res) => {
  const code = req.query.code || 'STATUS_ACTIVE';
  res.redirect(`${process.env.FRONTEND_URL || 'https://flow.graxion.in'}/data-deletion-policy?code=${code}`);
});

module.exports = router;
