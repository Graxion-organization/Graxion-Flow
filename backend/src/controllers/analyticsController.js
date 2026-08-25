const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Campaign = require('../models/Campaign');
const Agent = require('../models/Agent');
const Message = require('../models/Message');
const Deal = require('../models/Deal');
const Broadcast = require('../models/Broadcast');
const Contact = require('../models/Contact');
const SocialPostJob = require('../models/SocialPostJob');
const ApiUsageLog = require('../models/ApiUsageLog');

// Helper to get start and end dates based on timeframe
const getDateRange = (timeframe) => {
  const now = new Date();
  const start = new Date();
  if (timeframe === '7d') start.setDate(now.getDate() - 7);
  else if (timeframe === '30d') start.setDate(now.getDate() - 30);
  else if (timeframe === '90d') start.setDate(now.getDate() - 90);
  else start.setDate(now.getDate() - 7); // default 7d
  return { start, end: now };
};

// Helper to get org filter
const getOrgFilter = (req) => (req.organization?._id || req.user?.currentOrganization) 
  ? { organization: (req.organization?._id || req.user?.currentOrganization) }
  : { user: req.user._id };

exports.getMessageVolume = async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    const { start, end } = getDateRange(timeframe);
    const orgFilter = getOrgFilter(req);
    
    // 1. Fetch conversations belonging to the organization
    const conversations = await Conversation.find(orgFilter, '_id').lean();
    const convoIds = conversations.map(c => c._id);

    // 2. Aggregate messages
    const aggregation = await Message.aggregate([
      { $match: { conversationId: { $in: convoIds }, timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          sent: { $sum: { $cond: [{ $eq: ["$role", "assistant"] }, 1, 0] } },
          received: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Fill in missing dates to ensure the chart looks continuous
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const dataMap = {};
    aggregation.forEach(item => { dataMap[item._id] = item; });
    
    const data = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (dataMap[isoDate]) {
        data.push({ date: dateStr, sent: dataMap[isoDate].sent, received: dataMap[isoDate].received });
      } else {
        data.push({ date: dateStr, sent: 0, received: 0 });
      }
    }

    // 4. Calculate total Posts and Comments (approximated via webhooks)
    const [totalPosts, usageLogs] = await Promise.all([
      SocialPostJob.countDocuments({ ...orgFilter, publishedAt: { $gte: start, $lte: end } }),
      ApiUsageLog.aggregate([
        { $match: { ...orgFilter, bucketTime: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalWebhooks: { $sum: '$webhooks' } } }
      ])
    ]);
    const totalComments = usageLogs[0]?.totalWebhooks || 0;

    res.status(200).json({ status: 'success', data: { volume: data, totalPosts, totalComments } });
  } catch (err) {
    next(err);
  }
};

exports.getCreditUsage = async (req, res, next) => {
  try {
    const orgFilter = getOrgFilter(req);

    // Real credit usage breakdown by platform
    const platformUsage = await Conversation.aggregate([
      { $match: orgFilter },
      { $group: { _id: '$platform', totalTokens: { $sum: '$totalTokensUsed' }, count: { $sum: 1 } } },
      { $sort: { totalTokens: -1 } }
    ]);

    const colors = { whatsapp: '#25D366', instagram: '#E1306C', telegram: '#0088cc', facebook: '#1877F2' };
    const usage = platformUsage.map(p => ({
      name: (p._id || 'whatsapp').charAt(0).toUpperCase() + (p._id || 'whatsapp').slice(1),
      value: p.totalTokens || p.count,
      color: colors[p._id] || '#6B7280'
    }));

    // Also fetch user credits info
    const user = req.user;
    const creditsRemaining = Math.max(0, user?.subscription?.credits || 0);
    const totalCredits = user?.subscription?.totalCredits || 0;
    
    res.status(200).json({ 
      status: 'success', 
      data: { 
        usage: usage.length > 0 ? usage : [{ name: 'No Usage', value: 0, color: '#6B7280' }],
        creditsRemaining,
        totalCredits
      } 
    });
  } catch (err) {
    next(err);
  }
};

exports.getAiMetrics = async (req, res, next) => {
  try {
    const orgFilter = getOrgFilter(req);

    const [totalConvos, closedConvos, handoffConvos, tokenAgg, responseTimeAgg] = await Promise.all([
      Conversation.countDocuments(orgFilter),
      Conversation.countDocuments({ ...orgFilter, status: 'closed' }),
      Conversation.countDocuments({ ...orgFilter, status: 'human_handoff' }),
      Conversation.aggregate([
        { $match: orgFilter },
        { $group: { _id: null, total: { $sum: '$totalTokensUsed' } } }
      ]),
      // Average response time from messages
      Message.aggregate([
        { $match: { responseTime: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } }
      ])
    ]);

    const tokensUsed = tokenAgg[0]?.total || 0;
    const resolutionRate = totalConvos > 0 ? ((closedConvos / totalConvos) * 100).toFixed(1) + '%' : '0%';
    const handoffRate = totalConvos > 0 ? ((handoffConvos / totalConvos) * 100).toFixed(1) + '%' : '0%';
    const costSaved = '$' + (closedConvos * 5).toFixed(0);
    const avgResponseTime = responseTimeAgg[0]?.avg ? (responseTimeAgg[0].avg / 1000).toFixed(1) + 's' : '-';
    
    const metrics = { 
      averageResponseTime: avgResponseTime, 
      tokensUsed, 
      costSaved, 
      resolutionRate,
      handoffRate,
      totalConversations: totalConvos,
      closedConversations: closedConvos,
      handoffConversations: handoffConvos,
      activeConversations: totalConvos - closedConvos - handoffConvos
    };
    res.status(200).json({ status: 'success', data: { metrics } });
  } catch (err) {
    next(err);
  }
};

exports.getTemplatePerformance = async (req, res, next) => {
  try {
    const orgFilter = getOrgFilter(req);
    
    // Get real broadcast data for template performance
    const broadcasts = await Broadcast.find(orgFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('template', 'name')
      .lean();
    
    const data = broadcasts.map(b => ({
      name: b.template?.name || b.name || 'Unnamed',
      sent: b.sentCount || 0,
      delivered: b.deliveredCount || 0,
      read: b.readCount || 0,
      failed: b.failedCount || 0,
      status: b.status
    }));

    res.status(200).json({ status: 'success', data: { templates: data } });
  } catch (err) {
    next(err);
  }
};

exports.getBroadcastAnalytics = async (req, res, next) => {
  try {
    const orgFilter = getOrgFilter(req);
    
    const [totalBroadcasts, broadcastAgg] = await Promise.all([
      Broadcast.countDocuments(orgFilter),
      Broadcast.aggregate([
        { $match: orgFilter },
        { $group: { 
          _id: null, 
          totalSent: { $sum: '$sentCount' },
          totalDelivered: { $sum: '$deliveredCount' },
          totalRead: { $sum: '$readCount' },
          totalFailed: { $sum: '$failedCount' }
        }}
      ])
    ]);

    const agg = broadcastAgg[0] || {};
    const totalSent = agg.totalSent || 0;
    const totalDelivered = agg.totalDelivered || 0;
    const totalRead = agg.totalRead || 0;
    
    const stats = {
      totalBroadcasts,
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed: agg.totalFailed || 0,
      deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + '%' : '0%',
      readRate: totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(1) + '%' : '0%'
    };
    res.status(200).json({ status: 'success', data: { stats } });
  } catch (err) {
    next(err);
  }
};

exports.getAgentPerformance = async (req, res, next) => {
  try {
    const orgFilter = getOrgFilter(req);
    
    // Real agent performance from conversations
    const agentStats = await Conversation.aggregate([
      { $match: orgFilter },
      { $group: { 
        _id: '$agent',
        totalConversations: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'human_handoff'] }, 1, 0] } },
        totalMessages: { $sum: '$totalMessages' },
        totalTokens: { $sum: '$totalTokensUsed' }
      }},
      { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agentInfo' } },
      { $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true } },
      { $sort: { totalConversations: -1 } },
      { $limit: 10 }
    ]);
    
    const performance = agentStats.map(a => ({
      agent: a.agentInfo?.name || 'Unknown Agent',
      totalConversations: a.totalConversations,
      resolved: a.resolved,
      escalated: a.escalated,
      totalMessages: a.totalMessages,
      totalTokens: a.totalTokens,
      resolutionRate: a.totalConversations > 0 ? ((a.resolved / a.totalConversations) * 100).toFixed(1) : '0'
    }));

    res.status(200).json({ status: 'success', data: { performance } });
  } catch (err) {
    next(err);
  }
};

exports.getAgencyOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeframe } = req.query; // 'all' or 'current'

    // Fetch all active organizations the user is a member of
    const userOrgs = await Organization.find({ 'members.user': userId, isActive: true })
      .select('name slug')
      .lean();
    
    if (!userOrgs.length) {
      return res.status(200).json({ status: 'success', data: { organizations: [], globalQuota: null } });
    }

    const orgIds = userOrgs.map(o => o._id);
    const orgMap = {};
    userOrgs.forEach(o => { orgMap[o._id.toString()] = o; });

    const matchStage = { organization: { $in: orgIds } };
    
    if (timeframe !== 'all') {
      const startDate = req.user.subscription?.currentPeriodStart || req.user.usage?.lastResetDate;
      if (startDate) {
        matchStage.createdAt = { $gte: new Date(startDate) };
      }
    }

    // Aggregate conversation stats grouped by organization
    const orgStats = await Conversation.aggregate([
      { $match: matchStage },
      { $group: {
        _id: '$organization',
        totalMessages: { $sum: '$totalMessages' },
        totalTokens: { $sum: '$totalTokensUsed' },
        conversations: { $sum: 1 }
      }}
    ]);

    let totalAgencyMessages = 0;
    const organizationMetrics = userOrgs.map(org => {
      const stats = orgStats.find(s => s._id.toString() === org._id.toString()) || { totalMessages: 0, totalTokens: 0, conversations: 0 };
      totalAgencyMessages += stats.totalMessages;
      return {
        _id: org._id,
        name: org.name,
        slug: org.slug,
        messages: stats.totalMessages,
        tokens: stats.totalTokens,
        conversations: stats.conversations
      };
    });

    // Sort by messages descending
    organizationMetrics.sort((a, b) => b.messages - a.messages);

    const limits = await req.user.getPlanLimits();
    const globalQuota = {
      messagesLimit: limits.messages || 0,
      messagesUsed: req.user.usage.messagesThisMonth || totalAgencyMessages,
      creditsTotal: req.user.subscription?.totalCredits || 0,
      creditsUsed: req.user.usage?.agentCreditsUsedThisMonth || 0,
    };

    res.status(200).json({
      status: 'success',
      data: {
        globalQuota,
        organizations: organizationMetrics
      }
    });
  } catch (err) {
    next(err);
  }
};
