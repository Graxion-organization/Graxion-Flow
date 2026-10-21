const Redis = require('ioredis');
const logger = require('../utils/logger');

// Retrieve and sanitize Redis URL (handles accidental quotes, redis-cli prefixes, etc.)
let rawUrl = (process.env.REDIS_URL || '').trim();
if (rawUrl) {
  if (rawUrl.startsWith('REDIS_URL=')) rawUrl = rawUrl.replace(/^REDIS_URL=/, '').trim();
  rawUrl = rawUrl.replace(/^['"]|['"]$/g, '').trim();

  // If user pasted a redis-cli command from dashboard, extract just the URL
  if (rawUrl.includes('-u ')) {
    const parts = rawUrl.split('-u ');
    rawUrl = parts[parts.length - 1].trim().split(' ')[0];
  } else if (rawUrl.includes('rediss://')) {
    rawUrl = 'rediss://' + rawUrl.split('rediss://')[1].split(' ')[0];
  } else if (rawUrl.includes('redis://')) {
    const matches = rawUrl.match(/(rediss?:\/\/[a-zA-Z0-9_\-.:@]+)/g);
    if (matches && matches.length > 0) {
      rawUrl = matches[matches.length - 1];
    }
  }

  // Strip trailing punctuation like . , ;
  rawUrl = rawUrl.replace(/[.,;]+$/, '').trim();

  // If Upstash or TLS, ensure rediss:// protocol
  if (rawUrl.includes('upstash') && rawUrl.startsWith('redis://')) {
    rawUrl = rawUrl.replace(/^redis:\/\//, 'rediss://');
  }
}

// Validate URL format gracefully
let isValidUrl = false;
try {
  if (rawUrl) {
    new URL(rawUrl);
    isValidUrl = true;
  }
} catch (e) {
  logger.error(`Provided REDIS_URL is malformed: ${rawUrl}`);
}

let redis;
let redisConfig;

const baseOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 50) {
      logger.warn('Redis reconnection retries exhausted. Backing off.');
      return false;
    }
    return Math.min(times * 200, 3000);
  }
};

try {
  if (isValidUrl) {
    const options = { ...baseOptions };
    if (rawUrl.startsWith('rediss://') || rawUrl.includes('upstash') || process.env.REDIS_TLS === 'true') {
      options.tls = { rejectUnauthorized: false };
    }
    redisConfig = options;
    redis = new Redis(rawUrl, options);
  } else if (process.env.REDIS_HOST) {
    redisConfig = {
      ...baseOptions,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };
    if (process.env.REDIS_TLS === 'true' || process.env.REDIS_HOST.includes('upstash')) {
      redisConfig.tls = { rejectUnauthorized: false };
    }
    redis = new Redis(redisConfig);
  } else {
    // Default fallback to local redis
    redisConfig = {
      ...baseOptions,
      host: '127.0.0.1',
      port: 6379,
    };
    redis = new Redis(redisConfig);
  }
} catch (initErr) {
  logger.error('Failed to instantiate Redis client synchronously:', initErr.message);
  // Safe in-memory stub so application doesn't crash on require
  class RedisStub {
    constructor() { this.status = 'stub'; }
    on() { return this; }
    once() { return this; }
    emit() { return true; }
    async get() { return null; }
    async set() { return 'OK'; }
    async setex() { return 'OK'; }
    async del() { return 1; }
    async ping() { return 'PONG'; }
    quit() { return Promise.resolve(); }
    disconnect() {}
  }
  redis = new RedisStub();
  redisConfig = { ...baseOptions };
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
