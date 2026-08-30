const TrafficLog = require('../models/TrafficLog');
const AppError = require('../utils/AppError');
const crypto = require('crypto');

/**
 * Public endpoint to track user visits
 * POST /api/analytics/track
 */
exports.trackVisit = async (req, res, next) => {
  try {
    const { 
      referrer, 
      path, 
      utmSource, 
      utmMedium, 
      utmCampaign,
      device
    } = req.body;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const userId = req.user ? req.user._id : null; // If they are logged in
    
    // Generate a simple session ID based on IP and User-Agent to group hits
    const sessionId = crypto.createHash('md5').update(`${ip}-${userAgent}-${new Date().toISOString().split('T')[0]}`).digest('hex');

    // Determine the primary source
    let source = 'direct';
    if (utmSource) {
      source = utmSource.toLowerCase();
    } else if (referrer) {
      const refLower = referrer.toLowerCase();
      if (refLower.includes('chatgpt') || refLower.includes('openai')) source = 'chatgpt';
      else if (refLower.includes('instagram.com')) source = 'instagram';
      else if (refLower.includes('facebook.com')) source = 'facebook';
      else if (refLower.includes('linkedin.com')) source = 'linkedin';
      else if (refLower.includes('google.com')) source = 'google';
      else if (refLower.includes('youtube.com')) source = 'youtube';
      else source = 'referral';
    }

    // Only log once per session per path to avoid spam
    const existingLog = await TrafficLog.findOne({
      sessionId,
      path
    });

    if (!existingLog) {
      await TrafficLog.create({
        sessionId,
        ip,
        userAgent,
        device,
        source,
        referrer,
        path,
        utmSource,
        utmMedium,
        utmCampaign,
        userId
      });
    } else if (userId && !existingLog.userId) {
      // Update with userId if they logged in during this session
      existingLog.userId = userId;
      await existingLog.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    // Fail silently for tracking
    console.error('Traffic tracking error:', error);
    res.status(200).json({ success: false });
  }
};

/**
 * Admin endpoint to fetch traffic analytics
 * GET /api/analytics/traffic
 */
exports.getTrafficStats = async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
    else if (timeframe === '90d') startDate.setDate(now.getDate() - 90);
    else if (timeframe === '1y') startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30); // Default 30 days

    // 1. Total Visits grouped by Source
    const sourceStats = await TrafficLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { 
        $group: { 
          _id: "$source", 
          totalVisits: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" }
        } 
      },
      {
        $project: {
          source: "$_id",
          totalVisits: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
          _id: 0
        }
      },
      { $sort: { uniqueVisitors: -1 } }
    ]);

    // 2. Daily Trend (last X days)
    const dailyTrend = await TrafficLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          visits: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" }
        }
      },
      {
        $project: {
          date: "$_id",
          visits: 1,
          uniqueVisitors: { $size: "$uniqueSessions" },
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    // 3. Conversion mapping (Sessions that have a userId)
    const conversionStats = await TrafficLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, userId: { $ne: null } } },
      { 
        $group: { 
          _id: "$source", 
          convertedUsers: { $addToSet: "$userId" }
        } 
      },
      {
        $project: {
          source: "$_id",
          signups: { $size: "$convertedUsers" },
          _id: 0
        }
      }
    ]);

    // Merge conversion stats into source stats
    const enrichedSourceStats = sourceStats.map(stat => {
      const conv = conversionStats.find(c => c.source === stat.source);
      return {
        ...stat,
        signups: conv ? conv.signups : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        sourceStats: enrichedSourceStats,
        dailyTrend
      }
    });

  } catch (error) {
    next(error);
  }
};
