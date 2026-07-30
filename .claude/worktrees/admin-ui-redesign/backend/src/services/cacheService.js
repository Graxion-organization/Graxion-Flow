const { redis } = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  /**
   * Get data from cache, or execute fallback function and cache its result
   * @param {string} key - Redis key
   * @param {number} ttlSeconds - Time to live in seconds
   * @param {Function} fetchFn - Fallback function if cache miss
   */
  async getOrSet(key, ttlSeconds, fetchFn) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);

      const data = await fetchFn();
      if (data) {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
      }
      return data;
    } catch (err) {
      logger.error(`[CacheService] Error on key ${key}: ${err.message}`);
      // Fallback to fetch directly if Redis fails
      return await fetchFn();
    }
  }

  async invalidate(keyPattern) {
    try {
      const keys = await redis.keys(keyPattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (err) {
      logger.error(`[CacheService] Invalidate error: ${err.message}`);
    }
  }
}

module.exports = new CacheService();
