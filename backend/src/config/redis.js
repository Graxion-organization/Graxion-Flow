const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('✅ Successfully connected to Redis');
});

redis.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err);
});

module.exports = {
  redis,
  redisConfig
};
