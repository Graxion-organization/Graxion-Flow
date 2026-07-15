const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Meta allows up to 80 requests per second for webhooks per WABA in business tier.
// We will set a slightly more lenient limit per IP, but mainly we just want to avoid
// being spammed with thousands of requests from malicious IPs pretending to be Meta.
// Meta's webhook IPs are dynamic, but we can rate limit by IP as a baseline.
const webhookIpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3000, // 3000 requests per minute per IP (~50/sec)
  message: { status: 'error', message: 'Too many webhook requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Webhook IP Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

module.exports = { webhookIpLimiter };
