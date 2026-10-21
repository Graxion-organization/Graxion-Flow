const Redis = require('ioredis');
const logger = require('../utils/logger');

// Retrieve and sanitize Redis URL (handles accidental quotes, redis-cli prefixes, trailing punctuation, etc.)
let rawUrl = (process.env.REDIS_URL || '').trim();

// Fallback to user-provided production Redis URL if none provided
if (!rawUrl) {
  rawUrl = 'redis://default:8iiNSbDobPSjcY5I3YsQ7inf6EjbI8zZ@prose-sleet-clarion-41396.db.redis.io:12195';
}

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

  // If Upstash, ensure rediss:// protocol
  if (rawUrl.includes('upstash') && rawUrl.startsWith('redis://')) {
    rawUrl = rawUrl.replace(/^redis:\/\//, 'rediss://');
  }
}

// Validate URL format gracefully
let isValidUrl = false;
let urlObj = null;
try {
  if (rawUrl) {
    urlObj = new URL(rawUrl);
    isValidUrl = true;
  }
} catch (e) {
  logger.error(`Provided REDIS_URL is malformed: ${rawUrl}`);
}

let redis;
let redisConfig;
let isRedisStub = false;

const baseOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 10000,
  retryStrategy(times) {
    if (times > 20) {
      logger.warn('Redis reconnection retries exhausted (20 attempts). Pausing retry.');
      return false;
    }
    return Math.min(times * 300, 3000);
  }
};

try {
  if (isValidUrl && urlObj) {
    const isTls = rawUrl.startsWith('rediss://') || rawUrl.includes('upstash') || process.env.REDIS_TLS === 'true';
    redisConfig = {
      ...baseOptions,
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10) || (isTls ? 6380 : 6379),
      username: urlObj.username ? decodeURIComponent(urlObj.username) : undefined,
      password: urlObj.password ? decodeURIComponent(urlObj.password) : undefined,
    };

    if (urlObj.pathname && urlObj.pathname.length > 1) {
      const dbIndex = parseInt(urlObj.pathname.slice(1), 10);
      if (!isNaN(dbIndex)) redisConfig.db = dbIndex;
    }

    if (isTls) {
      redisConfig.tls = { rejectUnauthorized: false };
    }

    redis = new Redis(rawUrl, redisConfig);
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
  isRedisStub = true;
  // Safe in-memory stub so application doesn't crash on require
  class RedisStub {
    constructor() { this.status = 'stub'; }
    on() { return this; }
    once() { return this; }
    emit() { return true; }
    duplicate() { return this; }
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

let redisConnectedLogged = false;
let redisErrorLogged = false;

redis.on('connect', () => {
  if (!redisConnectedLogged) {
    logger.info(`✅ Successfully connected to Redis (${redisConfig.host || 'cluster'}:${redisConfig.port || ''})`);
    redisConnectedLogged = true;
    redisErrorLogged = false;
  }
});

redis.on('error', (err) => {
  if (!redisErrorLogged) {
    logger.error('❌ Redis Connection Error:', err.message || err);
    redisErrorLogged = true;
  }
});

module.exports = {
  redis,
  redisConfig,
  redisUrl: rawUrl,
  isRedisStub
};
