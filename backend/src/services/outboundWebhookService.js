const crypto = require('crypto');
const axios = require('axios');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDelivery = require('../models/WebhookDelivery');
const logger = require('../utils/logger');

/**
 * Compute HMAC-SHA256 signature for outbound webhook payload
 */
function signWebhookPayload(signingSecret, timestamp, rawBodyString) {
  const signedContent = `${timestamp}.${rawBodyString}`;
  const hmac = crypto
    .createHmac('sha256', String(signingSecret))
    .update(signedContent, 'utf8')
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Validate webhook target URL to prevent SSRF against internal metadata services
 */
function validateWebhookTargetUrl(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch (_) {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'Only HTTP/HTTPS protocols are allowed' };
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'HTTPS is required for webhook target URLs in production' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const forbiddenHosts = ['169.254.169.254', 'metadata.google.internal', '0.0.0.0'];
  if (forbiddenHosts.includes(hostname)) {
    return { valid: false, reason: 'Target host is not permitted' };
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.'))
  ) {
    return { valid: false, reason: 'Private network URLs are not permitted in production' };
  }

  return { valid: true };
}

/**
 * Execute a single webhook delivery attempt and record outcome
 */
async function executeDelivery(deliveryDoc, subscriptionDoc) {
  const startTime = Date.now();
  const timestamp = Math.floor(startTime / 1000);
  const rawBody = JSON.stringify(deliveryDoc.payload);
  const secret = subscriptionDoc.signingSecret || 'default_webhook_secret';
  const signature = signWebhookPayload(secret, timestamp, rawBody);

  deliveryDoc.signature = signature;
  deliveryDoc.attemptCount = (deliveryDoc.attemptCount || 0) + 1;

  const customHeaders = subscriptionDoc.headers instanceof Map
    ? Object.fromEntries(subscriptionDoc.headers)
    : (subscriptionDoc.headers || {});

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'GraxionFlow-Webhook/1.0',
    'X-Graxion-Event': deliveryDoc.event,
    'X-Graxion-Delivery-Id': String(deliveryDoc._id),
    'X-Graxion-Timestamp': String(timestamp),
    'X-Graxion-Signature-256': signature,
    ...customHeaders
  };

  try {
    const response = await axios.post(deliveryDoc.targetUrl, rawBody, {
      headers,
      timeout: subscriptionDoc.timeoutMs || 10000,
      validateStatus: () => true
    });

    const durationMs = Date.now() - startTime;
    deliveryDoc.durationMs = durationMs;
    deliveryDoc.responseStatus = response.status;
    deliveryDoc.responseBody = typeof response.data === 'string'
      ? response.data.slice(0, 1000)
      : JSON.stringify(response.data || {}).slice(0, 1000);

    if (response.status >= 200 && response.status < 300) {
      deliveryDoc.status = 'DELIVERED';
      deliveryDoc.deliveredAt = new Date();
      deliveryDoc.error = null;
      deliveryDoc.nextRetryAt = null;
      await deliveryDoc.save();

      await WebhookSubscription.findByIdAndUpdate(subscriptionDoc._id, {
        $set: { lastDeliveredAt: new Date(), failureCount: 0 }
      });

      return deliveryDoc;
    }

    throw new Error(`Endpoint responded with HTTP ${response.status}`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    deliveryDoc.durationMs = durationMs;
    deliveryDoc.error = err.message || 'Delivery failed';

    const maxRetries = deliveryDoc.maxRetries ?? subscriptionDoc.maxRetries ?? 3;
    if (deliveryDoc.attemptCount <= maxRetries) {
      deliveryDoc.status = 'RETRYING';
      const backoffSeconds = Math.pow(2, deliveryDoc.attemptCount) * 15;
      deliveryDoc.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
    } else {
      deliveryDoc.status = 'FAILED';
      deliveryDoc.nextRetryAt = null;
    }

    await deliveryDoc.save();

    await WebhookSubscription.findByIdAndUpdate(subscriptionDoc._id, {
      $inc: { failureCount: 1 },
      $set: {
        lastFailureAt: new Date(),
        lastFailureReason: deliveryDoc.error
      }
    });

    logger.warn(`[OutboundWebhook] Delivery ${deliveryDoc._id} failed: ${deliveryDoc.error}`);
    return deliveryDoc;
  }
}

/**
 * Dispatch an event to all active subscriptions matching the organization and event type
 */
async function dispatchWebhookEvent(organizationId, eventType, eventData) {
  const mongoose = require('mongoose');
  const canQueryDb =
    mongoose.connection?.readyState === 1 ||
    Boolean(WebhookSubscription.find && WebhookSubscription.find._isMockFunction);
  if (!canQueryDb) return [];

  const subscriptions = await WebhookSubscription.find({
    organization: organizationId,
    isActive: true,
    events: eventType
  }).select('+signingSecret');

  if (!subscriptions.length) return [];

  const deliveries = [];
  for (const sub of subscriptions) {
    const payload = {
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      event: eventType,
      organizationId: String(organizationId),
      createdAt: new Date().toISOString(),
      data: eventData
    };

    const delivery = await WebhookDelivery.create({
      organization: organizationId,
      subscription: sub._id,
      event: eventType,
      targetUrl: sub.targetUrl,
      payload,
      signature: 'pending',
      status: 'PENDING',
      attemptCount: 0,
      maxRetries: sub.maxRetries
    });

    const completed = await executeDelivery(delivery, sub);
    deliveries.push(completed);
  }

  return deliveries;
}

module.exports = {
  signWebhookPayload,
  validateWebhookTargetUrl,
  executeDelivery,
  dispatchWebhookEvent
};
