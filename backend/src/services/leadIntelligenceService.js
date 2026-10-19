const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Deal = require('../models/Deal');

// Interest keywords that indicate high buying intent (English + Hinglish)
const HIGH_INTEREST_KEYWORDS = [
  'price', 'cost', 'how much', 'buy', 'purchase', 'order', 'demo', 'trial',
  'interested', 'sign up', 'register', 'subscribe', 'plan', 'pricing',
  'sdx', 'product', 'service', 'feature', 'integration', 'start', 'begin',
  'kitna', 'khareedna', 'lena hai', 'batao', 'chahiye', 'karna hai'
];

/**
 * Compute lead intelligence score and classification for a conversation
 * using inline messages or external Message collection records.
 */
function scoreConversationLead(conv, userMessagesList = []) {
  const inlineUserMsgs = Array.isArray(conv.messages)
    ? conv.messages.filter((m) => m.role === 'user')
    : [];
  const effectiveUserMessages = userMessagesList.length > 0 ? userMessagesList : inlineUserMsgs;

  const msgCount = effectiveUserMessages.length || conv.messageCount || conv.totalMessages || 0;
  const allText = effectiveUserMessages.map((m) => (m.content || '').toLowerCase()).join(' ');

  const matchedKeywordsAll = HIGH_INTEREST_KEYWORDS.filter((kw) =>
    allText.includes(kw.toLowerCase())
  );
  const keywordMatches = matchedKeywordsAll.length;

  // Base: message volume (up to 40pts), keywords (up to 40pts), handoff (+20pts)
  const msgScore = Math.min(msgCount * 5, 40);
  const kwScore = Math.min(keywordMatches * 8, 40);
  const handoffBonus = conv.status === 'human_handoff' ? 20 : 0;
  const persistedScore = typeof conv.leadScore === 'number' && conv.leadScore > 0 ? conv.leadScore : 0;
  const computedScore = Math.min(msgScore + kwScore + handoffBonus, 100);
  const interestScore = Math.max(computedScore, persistedScore);

  let engagementLevel;
  let engagementColor;
  if (interestScore >= 70) {
    engagementLevel = 'Hot';
    engagementColor = 'red';
  } else if (interestScore >= 40) {
    engagementLevel = 'Warm';
    engagementColor = 'amber';
  } else if (interestScore >= 15) {
    engagementLevel = 'Interested';
    engagementColor = 'blue';
  } else {
    engagementLevel = 'Cold';
    engagementColor = 'gray';
  }

  const matchedKeywords = [...new Set(matchedKeywordsAll)].slice(0, 5);
  const lastUserMsgObj = effectiveUserMessages[effectiveUserMessages.length - 1];
  const lastUserMessage = (lastUserMsgObj?.content || '').slice(0, 200);

  return {
    _id: conv._id,
    organization: conv.organization,
    customerName: conv.customerName || conv.customerUsername || conv.customerPhone || 'Unknown',
    customerPhone: conv.customerPhone || null,
    customerUsername: conv.customerUsername || null,
    customerWaId: conv.customerWaId || null,
    platform: conv.platform || 'whatsapp',
    status: conv.status,
    interestScore,
    engagementLevel,
    engagementColor,
    matchedKeywords,
    wantsHuman: conv.status === 'human_handoff',
    totalMessages: conv.totalMessages || conv.messageCount || effectiveUserMessages.length,
    userMessages: msgCount,
    tags: conv.tags || [],
    notes: conv.notes || null,
    lastMessageAt: conv.lastMessageAt || conv.updatedAt,
    lastUserMessage,
    agentId: conv.agent?._id || conv.agent || null,
    agentName: conv.agent?.name || '—',
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
  };
}

/**
 * Query and score leads for a given filter (reused by Flow dashboard and Developer API).
 */
async function queryLeads({
  baseFilter,
  platform,
  status,
  search,
  minScore,
  engagementLevel,
  since,
  until,
  page = 1,
  limit = 20
}) {
  const filter = { ...baseFilter };
  if (platform) filter.platform = platform;
  if (status) filter.status = status;
  if (since || until) {
    filter.lastMessageAt = {};
    if (since) filter.lastMessageAt.$gte = new Date(since);
    if (until) filter.lastMessageAt.$lte = new Date(until);
  }
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
      { customerUsername: { $regex: search, $options: 'i' } }
    ];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [conversations, total, platformBreakdown, handoffCount, totalLeadsCount, hotLeadsCount] = await Promise.all([
    Conversation.find(filter)
      .populate('agent', 'name aiProvider model')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Conversation.countDocuments(filter),
    Conversation.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]),
    Conversation.countDocuments({ ...baseFilter, status: 'human_handoff' }),
    Conversation.countDocuments(baseFilter),
    Conversation.countDocuments({ ...baseFilter, totalMessages: { $gte: 6 } })
  ]);

  // Load user messages from Message collection for accurate scoring
  const convIds = conversations.map((c) => c._id);
  let messagesByConv = {};
  if (convIds.length > 0 && typeof Message.find === 'function') {
    try {
      const msgs = await Message.find({
        conversationId: { $in: convIds },
        role: 'user'
      })
        .sort({ timestamp: 1 })
        .select('conversationId content role timestamp')
        .lean();

      for (const m of msgs) {
        const key = String(m.conversationId);
        if (!messagesByConv[key]) messagesByConv[key] = [];
        messagesByConv[key].push(m);
      }
    } catch (_) {
      // Fallback gracefully if Message model is mocked in unit tests
    }
  }

  let leads = conversations.map((conv) =>
    scoreConversationLead(conv, messagesByConv[String(conv._id)] || [])
  );

  if (minScore !== undefined && minScore !== null && minScore !== '') {
    const min = Number(minScore);
    if (!Number.isNaN(min)) {
      leads = leads.filter((l) => l.interestScore >= min);
    }
  }

  if (engagementLevel) {
    leads = leads.filter(
      (l) => l.engagementLevel.toLowerCase() === String(engagementLevel).toLowerCase()
    );
  }

  return {
    leads,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
    summary: {
      totalLeads: totalLeadsCount,
      hotLeads: hotLeadsCount,
      wantHuman: handoffCount,
      platformBreakdown: (platformBreakdown || []).map((p) => ({
        platform: p._id || 'whatsapp',
        count: p.count
      }))
    }
  };
}

/**
 * Get a single conversation lead with recent messages and linked CRM contact/deals
 */
async function getLeadById(organizationId, conversationId) {
  const conv = await Conversation.findOne({
    _id: conversationId,
    organization: organizationId
  })
    .populate('agent', 'name aiProvider model')
    .lean();

  if (!conv) return null;

  let messages = [];
  if (typeof Message.find === 'function') {
    try {
      const recent = await Message.find({ conversationId: conv._id })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      messages = recent.reverse();
    } catch (_) {
      messages = conv.messages || [];
    }
  }

  const userMessages = messages.filter((m) => m.role === 'user');
  const scoredLead = scoreConversationLead(conv, userMessages);

  let contact = null;
  let deals = [];
  if (conv.customerPhone) {
    contact = await Contact.findOne({
      organization: organizationId,
      phone: conv.customerPhone
    }).lean();

    if (contact) {
      deals = await Deal.find({
        organization: organizationId,
        contact: contact._id
      })
        .sort({ createdAt: -1 })
        .lean();
    }
  }

  return {
    lead: scoredLead,
    messages,
    crm: {
      contact,
      deals
    }
  };
}

module.exports = {
  HIGH_INTEREST_KEYWORDS,
  scoreConversationLead,
  queryLeads,
  getLeadById
};
