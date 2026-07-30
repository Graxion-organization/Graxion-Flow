const FraudEvent = require('../models/FraudEvent');
const redisClient = require('../config/redisClient');
const AppError = require('../utils/AppError');

// Get Fraud Analytics (Totals, trends, breakdown)
exports.getFraudAnalytics = async (req, res, next) => {
  try {
    const totalEvents = await FraudEvent.countDocuments();
    const blockedCount = await FraudEvent.countDocuments({ action: 'block' });
    const otpCount = await FraudEvent.countDocuments({ action: 'require_otp' });
    const captchaCount = await FraudEvent.countDocuments({ action: 'require_captcha' });

    // Last 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await FraudEvent.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ["$action", "block"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalEvents,
        breakdown: { blocked: blockedCount, otp: otpCount, captcha: captchaCount },
        trends
      }
    });
  } catch (err) {
    next(new AppError('Failed to fetch analytics', 500));
  }
};

// Get Suspicious Activity Logs
exports.getSuspiciousEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const events = await FraudEvent.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await FraudEvent.countDocuments();

    res.status(200).json({
      status: 'success',
      results: events.length,
      total,
      data: { events }
    });
  } catch (err) {
    next(new AppError('Failed to fetch events', 500));
  }
};

// Get all currently blocked IPs from Redis
exports.getBlockedIPs = async (req, res, next) => {
  try {
    const keys = await redisClient.keys('block:*');
    const blocked = keys.map(key => key.replace('block:', ''));

    res.status(200).json({
      status: 'success',
      data: { blockedIPs: blocked }
    });
  } catch (err) {
    next(new AppError('Failed to fetch blocked IPs', 500));
  }
};

// Unblock an IP manually
exports.unblockIP = async (req, res, next) => {
  try {
    const { ip } = req.body;
    if (!ip) return next(new AppError('IP address is required', 400));

    await redisClient.del(`block:${ip}`);
    
    // Also clear failed logins to reset score
    const loginKeys = await redisClient.keys(`failed_login:${ip}:*`);
    for (const key of loginKeys) {
      await redisClient.del(key);
    }

    res.status(200).json({
      status: 'success',
      message: `IP ${ip} has been unblocked.`
    });
  } catch (err) {
    next(new AppError('Failed to unblock IP', 500));
  }
};
