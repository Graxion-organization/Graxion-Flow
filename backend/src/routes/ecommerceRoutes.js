const express = require('express');
const router = express.Router();
const ecommerceWebhookController = require('../controllers/ecommerceWebhookController');
const { verifyEcommerceSignature } = require('../middleware/verifyWebhookSignature');

// Webhook endpoint for e-commerce platforms (e.g. Shopify, WooCommerce)
// URL format: /api/webhooks/ecommerce/:orgId/abandoned-cart
router.post('/:orgId/abandoned-cart', verifyEcommerceSignature, ecommerceWebhookController.handleAbandonedCart);

module.exports = router;

