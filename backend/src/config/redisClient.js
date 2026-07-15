const { createClient } = require('redis');
const logger = require('../utils/logger');

// Retrieve and sanitize Redis URL (handles accidental quotes or REDIS_URL= prefix pasted in dashboard)
let rawUrl = process.env.REDIS_URL || '';
if (rawUrl) {
  rawUrl = rawUrl.trim();
  if (rawUrl.startsWith('REDIS_URL=')) {
    rawUrl = rawUrl.replace(/^REDIS_URL=/, '');
  }
  rawUrl = rawUrl.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

const REDIS_URL = rawUrl || null;

// Validate URL format gracefully to prevent ERR_INVALID_URL crashing the server
let isValidUrl = false;
try {
  if (REDIS_URL) {
    new URL(REDIS_URL);
    isValidUrl = true;
  }
} catch (e) {
  logger.error(`Provided REDIS_URL is fundamentally malformed: ${REDIS_URL}`);
}

// Configure Redis Client with a reconnect strategy
const redisClient = createClient({
  url: isValidUrl ? REDIS_URL : 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error('Redis max reconnection attempts reached. Please check your REDIS_URL.');
        return new Error('Max reconnection attempts reached');
      }
      return 5000;
    }
  }
});

// Avoid logging connection errors repeatedly if we don't have a valid remote URL in prod
redisClient.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    logger.error(`Redis connection refused. Ensure Redis is running and REDIS_URL is correctly set.`);
  } else {
    logger.error('Redis Client Error:', err.message);
  }
});

redisClient.on('connect', () => logger.info('Redis Client Connected'));
redisClient.on('ready', () => logger.info('Redis Client Ready to receive commands'));

// Auto-connect
(async () => {
  try {
    if (!isValidUrl && process.env.NODE_ENV === 'production') {
      logger.warn('WARNING: Valid REDIS_URL is missing in production. Application will start but fraud logic will fail.');
    }
    await redisClient.connect();
  } catch (err) {
    logger.error('Failed to connect to Redis initially:', err.message);
  }
})();

module.exports = redisClient;
