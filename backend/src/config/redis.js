const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;
let redisConfig;

if (process.env.REDIS_URL) {
  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    }
  };
  if (process.env.REDIS_URL.includes('rediss://') || process.env.REDIS_TLS === 'true' || process.env.REDIS_URL.includes('upstash')) {
    options.tls = { rejectUnauthorized: false };
  }
  redisConfig = options;
  redis = new Redis(process.env.REDIS_URL, options);
} else {
  redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    }
  };

  if (process.env.REDIS_TLS === 'true' || (process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash'))) {
    redisConfig.tls = { rejectUnauthorized: false };
  }

  redis = new Redis(redisConfig);
}

redis.on('connect', () => {
  logger.info('✅ Successfully connected to Redis');
});

redis.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err.message || err);
});

module.exports = {
  redis,
  redisConfig
};
