const rateLimit = require('express-rate-limit');

// WABA allows 80 req/sec for Tier 1+. 
// We set a slightly lower limit to avoid strict Meta blocks.
exports.wabaRateLimit = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests to WhatsApp API. Rate limit exceeded.'
  }
});