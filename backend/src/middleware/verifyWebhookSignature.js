const crypto = require('crypto');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Middleware to verify Meta (WhatsApp, Facebook, Instagram) webhook signatures.
 * Tests against META_APP_SECRET, INSTAGRAM_APP_SECRET, and FACEBOOK_APP_SECRET.
 */
exports.verifyMetaSignature = (req, res, next) => {
  const signatureHeader = req.headers['x-hub-signature-256'];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Collect all available secrets
  const appSecrets = [
    process.env.META_APP_SECRET,
    process.env.INSTAGRAM_APP_SECRET,
    process.env.FACEBOOK_APP_SECRET
  ].filter(Boolean);

  const hasAppSecret = appSecrets.length > 0;

  if (!signatureHeader) {
    if (isProduction || hasAppSecret) {
      logger.error('Missing X-Hub-Signature-256 header on incoming webhook request');
      return next(new AppError('Unauthorized: Webhook signature is missing.', 401));
    }
    logger.warn('Skipping webhook signature check in development (missing signature header)');
    return next();
  }

  if (!hasAppSecret) {
    logger.error('No Meta App Secrets are configured in environment variables');
    if (isProduction) {
      return next(new AppError('Server configuration error: Webhooks cannot be verified.', 500));
    }
    logger.warn('Skipping webhook signature check because no secrets are configured');
    return next();
  }

  try {
    const signatureParts = signatureHeader.split('=');
    const signatureHash = signatureParts[1];

    if (!signatureHash) {
      return next(new AppError('Unauthorized: Invalid signature format.', 401));
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
      logger.error(`Webhook signature validation failed for ${req.originalUrl}. Tested against ${appSecrets.length} secret(s).`);
      return next(new AppError('Unauthorized: Webhook signature mismatch.', 401));
    }

    next();
  } catch (err) {
    logger.error('Webhook signature verification error:', err);
    return next(new AppError('Unauthorized: Signature verification error.', 401));
  }
};
