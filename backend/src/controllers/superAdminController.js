const ApiUsageLog = require('../models/ApiUsageLog');
const RateLimitConfig = require('../models/RateLimitConfig');
const User = require('../models/User');
const WebhookLog = require('../models/WebhookLog');

exports.getGlobalStats = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [usageByPlatform, todayUsageByPlatform] = await Promise.all([
      ApiUsageLog.aggregate([
        {
          $group: {
            _id: '$platform',
            totalApi: { $sum: '$apiCalls' },
            totalWebhooks: { $sum: '$webhooks' }
          }
        }
      ]),
      ApiUsageLog.aggregate([
        { $match: { bucketTime: { $gte: startOfDay } } },
        {
          $group: {
            _id: '$platform',
            totalApi: { $sum: '$apiCalls' },
            totalWebhooks: { $sum: '$webhooks' }
          }
        }
      ])
    ]);

    // Format for frontend chart
    const formattedStats = usageByPlatform.map(u => ({
      platform: u._id,
      apiCalls: u.totalApi,
      webhooks: u.totalWebhooks
    }));

    const formattedTodayStats = todayUsageByPlatform.map(u => ({
      platform: u._id,
      apiCalls: u.totalApi,
      webhooks: u.totalWebhooks
    }));

    // Calculate totals
    const totals = formattedStats.reduce((acc, curr) => {
      acc.apiCalls += curr.apiCalls;
      acc.webhooks += curr.webhooks;
      return acc;
    }, { apiCalls: 0, webhooks: 0 });

    const todayTotals = formattedTodayStats.reduce((acc, curr) => {
      acc.apiCalls += curr.apiCalls;
      acc.webhooks += curr.webhooks;
      return acc;
    }, { apiCalls: 0, webhooks: 0 });

    res.status(200).json({
      status: 'success',
      data: {
        stats: formattedStats,
        todayStats: formattedTodayStats,
        totals,
        todayTotals
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getTopUsers = async (req, res, next) => {
  try {
    const topUsers = await ApiUsageLog.aggregate([
      {
        $group: {
          _id: { user: '$user', platform: '$platform' },
          totalApi: { $sum: '$apiCalls' },
          totalWebhooks: { $sum: '$webhooks' }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          totalApi: { $sum: '$totalApi' },
          totalWebhooks: { $sum: '$totalWebhooks' },
          platforms: {
            $push: {
              platform: '$_id.platform',
              apiCalls: '$totalApi',
              webhooks: '$totalWebhooks'
            }
          }
        }
      },
      { $sort: { totalApi: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          userId: '$_id',
          name: '$userInfo.name',
          email: '$userInfo.email',
          totalApi: 1,
          totalWebhooks: 1,
          platforms: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: { topUsers }
    });
  } catch (err) {
    next(err);
  }
};

exports.getRateLimits = async (req, res, next) => {
  try {
    const limits = await RateLimitConfig.find().populate('user', 'name email');
    res.status(200).json({
      status: 'success',
      data: { limits }
    });
  } catch (err) {
    next(err);
  }
};

exports.setRateLimit = async (req, res, next) => {
  try {
    const { scope, userId, platform, limitPerHour, limitPerDay } = req.body;
    
    if (scope === 'user' && !userId) {
      return res.status(400).json({ status: 'fail', message: 'userId required for user scope' });
    }

    const query = { scope, platform };
    if (scope === 'user') query.user = userId;

    const limitConfig = await RateLimitConfig.findOneAndUpdate(
      query,
      { limitPerHour, limitPerDay },
      { new: true, upsert: true }
    ).populate('user', 'name email');

    res.status(200).json({
      status: 'success',
      data: { limitConfig }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteRateLimit = async (req, res, next) => {
  try {
    const { id } = req.params;
    await RateLimitConfig.findByIdAndDelete(id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
