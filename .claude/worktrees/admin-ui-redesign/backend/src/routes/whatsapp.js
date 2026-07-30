const express = require('express');
const router = express.Router();
const waController = require('../controllers/whatsappController');
const webhookController = require('../controllers/webhookController');
const embeddedSignupController = require('../controllers/Embeddedsignupcontroller');
const { protect } = require('../middleware/auth');
const { injectOrganization, requireOrganization } = require('../middleware/organizationMiddleware');
const { validate, schemas } = require('../middleware/validation');

const { verifyMetaSignature } = require('../middleware/verifyWebhookSignature');

// Webhook routes (no auth - called by Meta)
router.get('/webhook', webhookController.verifyWebhook);
router.post('/webhook', verifyMetaSignature, webhookController.receiveMessage);

// Protected routes
router.use(protect);
router.use(injectOrganization);
router.use(requireOrganization);

// Embedded Signup routes
router.post('/embedded-signup/callback', embeddedSignupController.embeddedSignupCallback);
router.post('/embedded-signup/save', embeddedSignupController.embeddedSignupSave);

router.patch('/accounts/:id/business-profile', waController.updateBusinessProfile);
router.get('/accounts/:id/quality-rating', waController.getQualityRating);


router.post('/connect', validate(schemas.connectWhatsapp), waController.connectAccount);
router.get('/', waController.getAccounts);
router.get('/:id', waController.getAccount);
router.post('/:id/verify', waController.verifyConnection);
router.delete('/:id', waController.disconnectAccount);

module.exports = router;
