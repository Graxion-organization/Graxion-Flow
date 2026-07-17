const { createClient } = require('redis');
const logger = require('../utils/logger');

// Retrieve and sanitize Redis URL (handles accidental quotes or REDIS_URL= prefix pasted in dashboard)
let rawUrl = process.env.REDIS_URL || '';
if (rawUrl) {
  rawUrl = rawUrl.trim();
  if (rawUrl.startsWith('REDIS_URL=')) rawUrl = rawUrl.replace(/^REDIS_URL=/, '');
  rawUrl = rawUrl.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  // If user pasted a redis-cli command, extract just the URL
  if (rawUrl.includes('redis://')) {
    rawUrl = 'redis://' + rawUrl.split('redis://')[1].split(' ')[0];
  } else if (rawUrl.includes('rediss://')) {
    rawUrl = 'rediss://' + rawUrl.split('rediss://')[1].split(' ')[0];
  }
}

const REDIS_URL = rawUrl || null;

// Validate URL format gracefully
let isValidUrl = false;
try {
  if (REDIS_URL) {
    new URL(REDIS_URL);
    isValidUrl = true;
  }
} catch (e) {
  logger.error(`Provided REDIS_URL is fundamentally malformed: ${REDIS_URL}`);
}

const isUpstash = (process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash'));
const useTls = process.env.REDIS_TLS === 'true' || isUpstash;

let clientConfig = {
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error('Redis max reconnection attempts reached.');
        return new Error('Max reconnection attempts reached');
      }
      return 5000;
    }
  }
};

if (isValidUrl) {
  clientConfig.url = REDIS_URL;
  if (REDIS_URL.startsWith('rediss://') || REDIS_URL.includes('upstash')) {
    clientConfig.socket.tls = true;
    clientConfig.socket.rejectUnauthorized = false;
  }
} else if (process.env.REDIS_HOST) {
  clientConfig.socket.host = process.env.REDIS_HOST;
  clientConfig.socket.port = parseInt(process.env.REDIS_PORT || 6379);
  if (process.env.REDIS_PASSWORD) clientConfig.password = process.env.REDIS_PASSWORD;
  if (useTls) {
    clientConfig.socket.tls = true;
    clientConfig.socket.rejectUnauthorized = false;
  }
} else {
  clientConfig.url = 'redis://127.0.0.1:6379';
}

// Configure Redis Client
const redisClient = createClient(clientConfig);

// Avoid logging connection errors repeatedly if we don't have a valid remote URL in prod
redisClient.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    logger.error(`Redis connection refused. Ensure Redis is running and REDIS_URL is correctly set.`);
  } else {
    logger.error('Redis Client Error:', err);
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
