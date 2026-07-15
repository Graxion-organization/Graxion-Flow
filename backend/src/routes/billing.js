const express = require('express');
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Webhook must be raw body if we use body-parser, but we already handle it in server.js middleware if needed
router.post('/webhook', billingController.razorpayWebhook);

router.use(protect);

router.get('/plans', billingController.getPlans);
router.post('/create-subscription', billingController.createSubscription);
router.post('/verify', billingController.verifyPayment);
router.get('/history', billingController.getBillingHistory);
router.get('/credits/history', billingController.getCreditsHistory);
router.post('/upgrade', billingController.upgradePlan);
router.post('/refund', billingController.refundPayment);

module.exports = router;
