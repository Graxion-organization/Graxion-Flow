const ApiUsageLog = require('../models/ApiUsageLog');
const RateLimitConfig = require('../models/RateLimitConfig');

// Helper to get the start of the current hour
const getBucketTime = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
};

class RateLimitService {
  /**
   * Increment webhook count
   */
  async recordWebhook(userId, platform) {
    if (!userId) return;
    try {
      const bucketTime = getBucketTime();
      await ApiUsageLog.findOneAndUpdate(
        { user: userId, platform, bucketTime },
        { $inc: { webhooks: 1 } },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('Failed to record webhook usage:', err);
    }
  }

  /**
   * Check limit and increment API calls if allowed.
   * Returns true if allowed, false if limit exceeded.
   */
  async checkAndRecordApiCall(userId, platform) {
    if (!userId) return true;
    try {
      const bucketTime = getBucketTime();
      
      // Get usage for the current hour
      const currentLog = await ApiUsageLog.findOne({ user: userId, platform, bucketTime });
      const currentHourCalls = currentLog ? currentLog.apiCalls : 0;

      // Get usage for the current day (summing all hour buckets for today)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const dailyUsageAggr = await ApiUsageLog.aggregate([
        { $match: { user: userId, platform, bucketTime: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: null, totalApi: { $sum: '$apiCalls' } } }
      ]);
      const currentDayCalls = dailyUsageAggr.length > 0 ? dailyUsageAggr[0].totalApi : 0;

      // Fetch limits: Try user-specific first, fallback to global
      let limitConfig = await RateLimitConfig.findOne({ scope: 'user', user: userId, platform });
      if (!limitConfig) {
        limitConfig = await RateLimitConfig.findOne({ scope: 'global', platform });
      }
      if (!limitConfig) {
        // Fallback to "all" platforms global limit
        limitConfig = await RateLimitConfig.findOne({ scope: 'global', platform: 'all' });
      }

      // If no config at all, assume unlimited (or default)
      if (limitConfig) {
        if (currentHourCalls >= limitConfig.limitPerHour) {
          return false; // Hourly limit exceeded
        }
        if (currentDayCalls >= limitConfig.limitPerDay) {
          return false; // Daily limit exceeded
        }
      }

      // If allowed, increment apiCalls
      await ApiUsageLog.findOneAndUpdate(
        { user: userId, platform, bucketTime },
        { $inc: { apiCalls: 1 } },
        { upsert: true, new: true }
      );

      return true;
    } catch (err) {
      console.error('Failed to check rate limits:', err);
      // Fail open to avoid breaking system on DB errors
      return true;
    }
  }
}

module.exports = new RateLimitService();
