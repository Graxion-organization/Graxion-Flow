const crypto = require('crypto');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Middleware to verify Meta (WhatsApp, Facebook, Instagram) webhook signatures.
 * Tests against META_APP_SECRET, INSTAGRAM_APP_SECRET, and FACEBOOK_APP_SECRET.
 */
exports.verifyMetaSignature = (req, res, next) => {
  if (process.env.BYPASS_WEBHOOK_SIGNATURE === 'true') {
    logger.info('[Webhook Signature] Bypassing signature verification (BYPASS_WEBHOOK_SIGNATURE=true)');
    return next();
  }

  const signatureHeader = req.headers['x-hub-signature-256'];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Collect all available secrets (Instagram, Meta, Facebook, WhatsApp)
  const appSecrets = [
    process.env.INSTAGRAM_APP_SECRET,
    process.env.META_APP_SECRET,
    process.env.FACEBOOK_APP_SECRET,
    process.env.WHATSAPP_APP_SECRET
  ].filter(Boolean);

  const hasAppSecret = appSecrets.length > 0;

  if (!signatureHeader) {
    if (process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true') {
      logger.error('Missing X-Hub-Signature-256 header on incoming webhook request');
      return next(new AppError('Unauthorized: Webhook signature is missing.', 401));
    }
    logger.warn('[Webhook Signature] Missing X-Hub-Signature-256 header. Allowing request (set ENFORCE_WEBHOOK_SIGNATURE=true to strictly block).');
    return next();
  }

  if (!hasAppSecret) {
    if (process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true') {
      logger.error('No Meta App Secrets are configured in environment variables');
      return next(new AppError('Server configuration error: Webhooks cannot be verified.', 500));
    }
    logger.warn('[Webhook Signature] No Meta App Secrets configured in environment. Allowing incoming webhook.');
    return next();
  }

  try {
    const signatureParts = signatureHeader.split('=');
    const signatureHash = signatureParts[1];

    if (!signatureHash) {
      if (process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true') {
        return next(new AppError('Unauthorized: Invalid signature format.', 401));
      }
      logger.warn('[Webhook Signature] Invalid signature format, allowing request.');
      return next();
    }

    const payload = req.rawBody || Buffer.from('');
    let isValid = false;

    // Test the payload against all configured secrets
    for (const secret of appSecrets) {
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const sigBuf = Buffer.from(signatureHash, 'utf8');
      const expBuf = Buffer.from(expectedHash, 'utf8');

      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        isValid = true;
        break; // Match found
      }
    }

    if (!isValid) {
      const safeSecrets = appSecrets.map(s => s ? s.substring(0, 3) + '***' : 'null');
      logger.warn(`[Webhook Signature Warning] Signature mismatch for ${req.originalUrl}. Tested secrets: ${safeSecrets.join(', ')}.`);
      
      if (process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true') {
        logger.error(`[DEBUG] Received Hash: ${signatureHash}`);
        logger.error(`[DEBUG] req.rawBody length: ${payload.length}`);
        return next(new AppError('Unauthorized: Webhook signature mismatch.', 401));
      }

      logger.info('[Webhook Signature] Allowing webhook through despite mismatch (ENFORCE_WEBHOOK_SIGNATURE is not true).');
    }

    next();
  } catch (err) {
    logger.error('Webhook signature verification error:', err);
    if (process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true') {
      return next(new AppError('Unauthorized: Signature verification error.', 401));
    }
    next();
  }
};

/**
 * Middleware to verify incoming E-Commerce (Shopify / WooCommerce / Graxion) webhook signatures.
 * Checks X-Shopify-Hmac-Sha256, X-WC-Webhook-Signature, or X-Graxion-Webhook-Signature
 * against the organization's Integration secret or ECOMMERCE_WEBHOOK_SECRET.
 */
exports.verifyEcommerceSignature = async (req, res, next) => {
  try {
    const signatureHeader =
      req.headers['x-shopify-hmac-sha256'] ||
      req.headers['x-wc-webhook-signature'] ||
      req.headers['x-graxion-webhook-signature'];

    if (!signatureHeader) {
      return next(new AppError('Unauthorized: E-commerce webhook signature is missing.', 401));
    }

    const { orgId } = req.params;
    const secrets = [];
    if (process.env.ECOMMERCE_WEBHOOK_SECRET) {
      secrets.push(process.env.ECOMMERCE_WEBHOOK_SECRET);
    }

    if (orgId) {
      try {
        const Integration = require('../models/Integration');
        const integration = await Integration.findOne({
          organization: orgId,
          platform: 'shopify',
          status: 'connected'
        }).lean();
        if (integration?.credentials?.webhookSecret) {
          secrets.push(integration.credentials.webhookSecret);
        }
        if (integration?.credentials?.accessToken) {
          secrets.push(integration.credentials.accessToken);
        }
      } catch (_) {
        // Ignore DB lookup errors and fall back to env secret
      }
    }

    if (secrets.length === 0) {
      return next(new AppError('Unauthorized: No e-commerce webhook secret configured for verification.', 401));
    }

    const payloadBuffer = req.rawBody
      ? Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(String(req.rawBody), 'utf8')
      : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    const incomingSig = String(signatureHeader).replace(/^sha256=/, '').trim();
    let verified = false;

    for (const secret of secrets) {
      const hexDigest = crypto.createHmac('sha256', String(secret)).update(payloadBuffer).digest('hex');
      const base64Digest = crypto.createHmac('sha256', String(secret)).update(payloadBuffer).digest('base64');

      const sigBuf = Buffer.from(incomingSig, 'utf8');
      const hexBuf = Buffer.from(hexDigest, 'utf8');
      const b64Buf = Buffer.from(base64Digest, 'utf8');

      if (
        (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) ||
        (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf))
      ) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      return next(new AppError('Unauthorized: E-commerce webhook signature mismatch.', 401));
    }

    next();
  } catch (err) {
    return next(new AppError('Unauthorized: E-commerce webhook verification failed.', 401));
  }
};

