const crypto = require('crypto');
const AppError = require('../utils/AppError');

// CSRF secret key - ideally in env, but can use ENCRYPTION_KEY or JWT_SECRET
const getSecret = () => process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default_csrf_secret';

/**
 * Generate CSRF token and set secure cookie
 */
const generateCsrfToken = (req, res) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const secret = getSecret();
  const signature = crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
  const token = `${rawToken}.${signature}`;

  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || isProduction;

  // Set the hash in an httpOnly cookie for browsers supporting cross-site cookies
  res.cookie('_csrfSecret', signature, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Return the signed token to the client
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

  // Skip webhooks and auth refresh-token endpoint (uses httpOnly refreshToken cookie)
  if (
    req.originalUrl.includes('/webhook') || 
    req.originalUrl.includes('/api/whatsapp/webhook') ||
    req.originalUrl.includes('/api/auth/refresh-token')
  ) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  if (!token) {
    return next(new AppError('CSRF token missing. Request blocked.', 403));
  }

  const secret = getSecret();

  // If token is signed (contains rawToken.signature)
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return next(new AppError('Invalid CSRF token format. Request blocked.', 403));
    }
    const [rawToken, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawToken).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return next(new AppError('Invalid CSRF token signature. Request blocked.', 403));
    }

    // If cookie is also present, verify cookie signature match
    const hash = req.cookies?.['_csrfSecret'];
    if (hash) {
      const hashBuffer = Buffer.from(hash);
      if (signatureBuffer.length === hashBuffer.length && !crypto.timingSafeEqual(signatureBuffer, hashBuffer)) {
        return next(new AppError('CSRF cookie mismatch. Request blocked.', 403));
      }
    }
  } else {
    // Legacy token validation
    const hash = req.cookies?.['_csrfSecret'];
    if (!hash) {
      return next(new AppError('CSRF token missing. Request blocked.', 403));
    }
    const expectedHash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    const expectedBuffer = Buffer.from(expectedHash);
    const hashBuffer = Buffer.from(hash);

    if (expectedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(expectedBuffer, hashBuffer)) {
      return next(new AppError('Invalid CSRF token. Request blocked.', 403));
    }
  }

  next();
};

module.exports = { generateCsrfToken, validateCsrf };
