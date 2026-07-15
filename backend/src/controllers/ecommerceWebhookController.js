const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Organization = require('../models/Organization');
const Contact = require('../models/Contact');
const logger = require('../utils/logger');
// Mocking the Whatsapp service
const whatsappService = require('../services/whatsappService');

/**
 * Handle incoming webhooks from Shopify/WooCommerce
 * Assuming payload format is loosely normalized or we detect the source
 */
exports.handleAbandonedCart = catchAsync(async (req, res, next) => {
  const { orgId } = req.params;
  const payload = req.body;

  // 1. Validate Organization
  const org = await Organization.findById(orgId);
  if (!org) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  // 2. Extract Data (Simplified for Shopify-like payload)
  const customerEmail = payload.email;
  const customerPhone = payload.phone || payload.customer?.phone || payload.billing_address?.phone;
  const cartUrl = payload.abandoned_checkout_url;
  const items = payload.line_items || [];
  
  if (!customerPhone) {
    logger.warn(`[E-Commerce Webhook] Abandoned cart for org ${orgId} missing phone number.`);
    return res.status(200).json({ status: 'ignored', reason: 'no phone number' });
  }

  const formattedPhone = customerPhone.replace(/\D/g, ''); // Basic formatting

  // 3. Find or Create Contact
  let contact = await Contact.findOne({ organization: orgId, phone: formattedPhone });
  if (!contact) {
    contact = await Contact.create({
      organization: orgId,
      phone: formattedPhone,
      name: payload.customer?.first_name || 'Customer',
      email: customerEmail,
      source: 'ecommerce_webhook'
    });
  }

  // 4. Update Timeline
  contact.timeline.push({
    type: 'ORDER',
    title: 'Abandoned Cart',
    description: `${items.length} items left in cart`,
    metadata: { cartUrl, items: items.map(i => i.title) }
  });
  await contact.save();

  // 5. Trigger WhatsApp Flow (Mocked for now, would typically use FlowEngine or WhatsAppService)
  // Assuming the org has a template named 'abandoned_cart_reminder'
  try {
    /*
    await whatsappService.sendTemplateMessage(
      org.whatsapp.phoneNumberId,
      formattedPhone,
      'abandoned_cart_reminder',
      'en_US',
      [
        { type: 'text', text: contact.name },
        { type: 'text', text: cartUrl }
      ],
      org.whatsapp.accessToken
    );
    */
    logger.info(`[E-Commerce Webhook] Processed abandoned cart for ${formattedPhone}`);
  } catch (err) {
    logger.error(`[E-Commerce Webhook] Failed to send WhatsApp message: ${err.message}`);
  }

  res.status(200).json({ status: 'success', message: 'Webhook processed' });
});
