const crypto = require('crypto');
const AppError = require('../utils/AppError');

// CSRF secret key - ideally in env, but can use ENCRYPTION_KEY or JWT_SECRET
const getSecret = () => process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default_csrf_secret';

/**
 * Generate CSRF token and set secure cookie
 */
const generateCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const secret = getSecret();
  const hash = crypto.createHmac('sha256', secret).update(token).digest('hex');

  // Set the hash in an httpOnly cookie
  res.cookie('_csrfSecret', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Return the raw token to the client (to be stored in memory and sent in headers)
  return token;
};

/**
 * Validate CSRF token on mutating requests
 */
const validateCsrf = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip webhooks since they use signature verification, not CSRF
  if (req.originalUrl.includes('/webhook') || req.originalUrl.includes('/api/whatsapp/webhook')) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const hash = req.cookies?.['_csrfSecret'];

  if (!token || !hash) {
    return next(new AppError('CSRF token missing. Request blocked.', 403));
  }

  const secret = getSecret();
  const expectedHash = crypto.createHmac('sha256', secret).update(token).digest('hex');

  // Secure time-safe comparison
  const expectedBuffer = Buffer.from(expectedHash);
  const hashBuffer = Buffer.from(hash);

  if (expectedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(expectedBuffer, hashBuffer)) {
    return next(new AppError('Invalid CSRF token. Request blocked.', 403));
  }

  next();
};

module.exports = { generateCsrfToken, validateCsrf };
