const Conversation = require('../models/Conversation');
const Deal = require('../models/Deal');
const Broadcast = require('../models/Broadcast');
const Organization = require('../models/Organization');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const WhatsAppService = require('../services/whatsappService');
const TelegramService = require('../services/telegramService');
const InstagramService = require('../services/instagramService');
const FacebookService = require('../services/facebookService');
const { emitToUser } = require('../utils/socket');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// Helper to get consistent base filter for multi-tenancy
const getBaseFilter = async (req) => {
  if (req.query?.global === 'true' && req.user) {
    const orgs = await Organization.find({ 'members.user': req.user._id, isActive: true }).select('_id');
    const orgIds = orgs.map(org => org._id);
    return { organization: { $in: orgIds } };
  }
  return req.organization 
    ? { organization: req.organization._id }
    : { user: req.user._id };
};

exports.getConversations = async (req, res, next) => {
  try {
    const { status, agentId, platform, page = 1, limit = 20, search } = req.query;
    const filter = await getBaseFilter(req);

    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (agentId) filter.agent = agentId;
    if (search) {
      filter.$or = [
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('agent', 'name aiProvider')
        .select('-messages')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      results: conversations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: { conversations },
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      ...(await getBaseFilter(req))
    }).populate('agent', 'name aiProvider model');

    if (!conversation) return next(new AppError('Conversation not found.', 404));

    // Mark as read
    if (!conversation.isRead) {
      conversation.isRead = true;
      await conversation.save();
    }

    // Fetch recent messages to maintain frontend compatibility
    const messages = await conversation.getRecentMessages(50);
    const conversationData = conversation.toObject();
    conversationData.messages = messages;

    res.status(200).json({ status: 'success', data: { conversation: conversationData } });
  } catch (err) {
    next(err);
  }
};

exports.replyToConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, replyToMessageId } = req.body;
    if (!message) return next(new AppError('Message is required.', 400));

    const conversation = await Conversation.findOne({ _id: id, ...(await getBaseFilter(req)) })
      .populate({ path: 'whatsappAccount', select: '+accessToken phoneNumberId' })
      .populate({ path: 'telegramAccount', select: '+botToken' })
      .populate({ path: 'instagramAccount', select: '+pageAccessToken pageId igAccountId' })
      .populate({ path: 'facebookAccount', select: '+pageAccessToken pageId' });

    if (!conversation) return next(new AppError('Conversation not found.', 404));

    let sentMsg;

    if (conversation.platform === 'whatsapp') {
      const waAccount = conversation.whatsappAccount;
      if (!waAccount) return next(new AppError('WhatsApp account not connected.', 400));
      const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
      sentMsg = await waService.sendTextMessage(conversation.customerPhone, message, replyToMessageId);
    } else if (conversation.platform === 'telegram') {
      const tgAccount = conversation.telegramAccount;
      if (!tgAccount) return next(new AppError('Telegram account not connected.', 400));
      const tgService = new TelegramService(tgAccount.botToken);
      sentMsg = await tgService.sendTextMessage(conversation.customerTgId, message, replyToMessageId);
    } else if (conversation.platform === 'instagram') {
      const igAccount = conversation.instagramAccount;
      if (!igAccount) return next(new AppError('Instagram account not connected.', 400));
      const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
      sentMsg = await igService.sendTextMessage(igAccount.igAccountId, conversation.customerIgId, message, replyToMessageId);
    } else if (conversation.platform === 'facebook') {
      let fbAccount = conversation.facebookAccount;
      if (!fbAccount) {
        // Fallback: if reference is broken (e.g. integration reconnected), find active account for org
        const FacebookAccount = require('../models/FacebookAccount');
        fbAccount = await FacebookAccount.findOne({ 
          organization: conversation.organization, 
          status: 'connected', 
          isActive: true 
        }).select('+pageAccessToken');
      }
      if (!fbAccount) return next(new AppError('Facebook account not connected.', 400));
      const fbService = new FacebookService(fbAccount.pageAccessToken, fbAccount.pageId);
      sentMsg = await fbService.sendTextMessage(conversation.customerFbId, message, replyToMessageId);
    } else {
      return next(new AppError('Unsupported platform.', 400));
    }

    // Save assistant message
    await conversation.addMessage({
      role: 'assistant',
      content: message,
      waMessageId: sentMsg?.messages?.[0]?.id || sentMsg?.message_id || '',
      replyToMessageId: replyToMessageId || null,
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
    });

    conversation.totalMessages += 1;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Emit to update socket clients
    emitToUser(req.user._id.toString(), 'conversation_updated', {
      conversationId: conversation._id,
      messages: await conversation.getRecentMessages(),
    });

    res.status(200).json({ status: 'success', data: { conversation } });
  } catch (err) {
    next(err);
  }
};

exports.closeConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, ...(await getBaseFilter(req)) },
      { status: 'closed', resolvedAt: new Date() },
      { new: true }
    );
    if (!conversation) return next(new AppError('Conversation not found.', 404));

    await conversation.addMessage({
      role: 'system',
      content: 'System: Conversation closed.',
      timestamp: new Date(),
    });
    await conversation.save();

    res.status(200).json({ status: 'success', data: { conversation } });
  } catch (err) {
    next(err);
  }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'human_handoff', 'closed'].includes(status)) {
      return next(new AppError('Invalid status.', 400));
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, ...(await getBaseFilter(req)) },
      { status },
      { new: true }
    );

    if (!conversation) return next(new AppError('Conversation not found.', 404));

    // Add a system message to indicate status change
    const statusLabel = status === 'active' ? 'AI Agent' : status === 'human_handoff' ? 'Human Agent' : 'Closed';
    await conversation.addMessage({
      role: 'system',
      content: `System: Conversation assigned to ${statusLabel}.`,
      timestamp: new Date(),
    });
    await conversation.save();

    res.status(200).json({ status: 'success', data: { conversation } });
  } catch (err) {
    next(err);
  }
};



exports.getDashboardStats = async (req, res, next) => {
  try {
    const baseFilter = await getBaseFilter(req);
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      totalConversations,
      activeConversations,
      monthlyConversations,
      unreadCount,
      weeklyMessages,
      avgResponseTime,
      platformBreakdown,
      handoffCount,
      activeBroadcasts,
      dealsData,
      topAgents,
      recentDeals
    ] = await Promise.all([
      Conversation.countDocuments(baseFilter),
      Conversation.countDocuments({ ...baseFilter, status: 'active' }),
      Conversation.countDocuments({ ...baseFilter, createdAt: { $gte: startOfMonth } }),
      Conversation.countDocuments({ ...baseFilter, isRead: false }),
      Conversation.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$totalMessages' } } },
      ]),
      Conversation.aggregate([
        { $match: baseFilter },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'assistant', 'messages.responseTime': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$messages.responseTime' } } },
      ]),
      Conversation.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      Conversation.countDocuments({ ...baseFilter, status: 'human_handoff' }),
      Broadcast.countDocuments({ ...baseFilter, status: 'IN_PROGRESS' }),
      Deal.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, totalPipelineValue: { $sum: '$amount' }, dealsCount: { $sum: 1 } } }
      ]),
      Conversation.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$agent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
        { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agentInfo' } },
        { $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true } }
      ]),
      Deal.find(baseFilter).sort({ createdAt: -1 }).limit(3).lean()
    ]);

    // Daily message count for last 7 days
    const dailyStats = await Conversation.aggregate([
      { $match: { ...baseFilter, lastMessageAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastMessageAt' } }, count: { $sum: '$totalMessages' } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalConversations,
        activeConversations,
        monthlyConversations,
        unreadCount,
        weeklyMessages: weeklyMessages[0]?.total || 0,
        avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
        dailyStats,
        platformBreakdown: platformBreakdown.map((p) => ({ platform: p._id || 'whatsapp', count: p.count })),
        handoffCount,
        activeBroadcasts,
        pipelineValue: dealsData[0]?.totalPipelineValue || 0,
        dealsCount: dealsData[0]?.dealsCount || 0,
        topAgents: topAgents.map(a => ({
          name: a.agentInfo?.name || 'Unknown Agent',
          count: a.count
        })),
        recentDeals,
        usage: {
          messagesThisMonth: req.user.usage?.messagesThisMonth || 0,
          limit: (await req.user.getPlanLimits()).messages,
          plan: req.user.subscription?.plan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── LEAD INTELLIGENCE DASHBOARD ─────────────────────────────────────────────
exports.getLeadsDashboard = async (req, res, next) => {
  try {
    const { platform, status, search, page = 1, limit = 20 } = req.query;
    const leadIntelligenceService = require('../services/leadIntelligenceService');
    const baseFilter = await getBaseFilter(req);

    const result = await leadIntelligenceService.queryLeads({
      baseFilter,
      platform,
      status,
      search,
      page,
      limit
    });

    res.status(200).json({
      status: 'success',
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.page,
      data: {
        leads: result.leads,
        summary: result.summary,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversationTemplates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({ _id: id, ...(await getBaseFilter(req)) })
      .populate({ path: 'whatsappAccount', select: '+accessToken phoneNumberId wabaId' });

    if (!conversation) return next(new AppError('Conversation not found.', 404));
    if (conversation.platform !== 'whatsapp') {
      return res.status(200).json({ status: 'success', data: { templates: [] } });
    }

    const waAccount = conversation.whatsappAccount;
    if (!waAccount) return next(new AppError('WhatsApp account not connected.', 400));

    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
    
    let templates = [];
    try {
      if (waAccount.wabaId) {
        const result = await waService.getMessageTemplates(waAccount.wabaId);
        templates = result.data || [];
      }
    } catch (err) {
      logger.warn(`Could not fetch templates from Meta API: ${err.message}. Returning defaults.`);
      // Default fallback templates
      templates = [
        {
          name: 'hello_world',
          language: 'en_US',
          category: 'UTILITY',
          components: [
            { type: 'BODY', text: 'Hello! Thank you for contacting us. We wanted to follow up on your last message.' }
          ]
        },
        {
          name: 'utility_notification',
          language: 'en_US',
          category: 'UTILITY',
          components: [
            { type: 'BODY', text: 'Hi, this is a message from our team regarding your query. Please reply to resume the conversation.' }
          ]
        }
      ];
    }

    res.status(200).json({ status: 'success', data: { templates } });
  } catch (err) {
    next(err);
  }
};

exports.sendTemplateReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { templateName, languageCode, components } = req.body;
    if (!templateName) return next(new AppError('Template name is required.', 400));

    const conversation = await Conversation.findOne({ _id: id, ...(await getBaseFilter(req)) })
      .populate({ path: 'whatsappAccount', select: '+accessToken phoneNumberId' });

    if (!conversation) return next(new AppError('Conversation not found.', 404));
    if (conversation.platform !== 'whatsapp') {
      return next(new AppError('Templates are only supported for WhatsApp conversations.', 400));
    }

    const waAccount = conversation.whatsappAccount;
    if (!waAccount) return next(new AppError('WhatsApp account not connected.', 400));

    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
    
    const lang = languageCode || 'en_US';
    const comp = components || [];

    const Template = require('../models/Template');
    const templateDoc = await Template.findOne({ name: templateName, organization: conversation.organization });
    const category = templateDoc ? templateDoc.category : 'UTILITY';

    const sentMsg = await waService.sendTemplateMessage(
      conversation.customerPhone,
      templateName,
      lang,
      comp,
      category
    );

    // Save assistant message in conversation
    const displayContent = `[Template Message: ${templateName}]`;
    await conversation.addMessage({
      role: 'assistant',
      content: displayContent,
      waMessageId: sentMsg?.messages?.[0]?.id || '',
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
    });

    conversation.totalMessages += 1;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Emit socket event
    emitToUser(req.user._id.toString(), 'conversation_updated', {
      conversationId: conversation._id,
      messages: await conversation.getRecentMessages(),
    });

    res.status(200).json({ status: 'success', data: { conversation } });
  } catch (err) {
    next(err);
  }
};

exports.createConversationTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, language, bodyText } = req.body;

    if (!name || !category || !language || !bodyText) {
      return next(new AppError('All fields (name, category, language, bodyText) are required.', 400));
    }

    // Validate name format: lowercase alphanumeric and underscores only
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return next(new AppError('Template name must contain only lowercase alphanumeric characters and underscores.', 400));
    }

    const conversation = await Conversation.findOne({ _id: id, ...(await getBaseFilter(req)) })
      .populate({ path: 'whatsappAccount', select: '+accessToken phoneNumberId wabaId' });

    if (!conversation) return next(new AppError('Conversation not found.', 404));
    if (conversation.platform !== 'whatsapp') {
      return next(new AppError('Templates are only supported for WhatsApp conversations.', 400));
    }

    const waAccount = conversation.whatsappAccount;
    if (!waAccount) return next(new AppError('WhatsApp account not connected.', 400));
    if (!waAccount.wabaId) return next(new AppError('WhatsApp Business Account ID (WABA ID) is missing.', 400));

    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

    const templateData = {
      name,
      category,
      language,
      components: [
        {
          type: 'BODY',
          text: bodyText
        }
      ]
    };

    const result = await waService.createMessageTemplate(waAccount.wabaId, templateData);

    res.status(201).json({
      status: 'success',
      data: {
        template: result
      }
    });
  } catch (err) {
    next(err);
  }
};




exports.getMessages = async (req, res) => {
  try {
    const baseFilter = await getBaseFilter(req);
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      ...baseFilter
    }).select('_id').lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const Message = require('../models/Message');
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Return in chronological order for frontend
    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addTag = catchAsync(async (req, res, next) => {
  const { tag } = req.body;
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, organization: (req.organization?._id || req.user?.currentOrganization) },
    { $addToSet: { tags: tag } },
    { new: true }
  );
  if (!conversation) return next(new AppError('Conversation not found', 404));
  res.status(200).json({ status: 'success', data: { tags: conversation.tags } });
});

exports.removeTag = catchAsync(async (req, res, next) => {
  const { tag } = req.params;
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, organization: (req.organization?._id || req.user?.currentOrganization) },
    { $pull: { tags: tag } },
    { new: true }
  );
  if (!conversation) return next(new AppError('Conversation not found', 404));
  res.status(200).json({ status: 'success', data: { tags: conversation.tags } });
});
