const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiter keyed by organization ID to enforce tenant-level limits.
 * Falls back to IP if organization ID is not present.
 */
const tenantRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per organization
  keyGenerator: (req) => {
    // Key by organization ID if present, otherwise IP
    return req.headers['x-organization-id'] || req.cookies?.organizationId || req.ip;
  },
  message: {
    success: false,
    message: 'Too many requests from this organization, please try again after a minute',
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

module.exports = tenantRateLimit;
