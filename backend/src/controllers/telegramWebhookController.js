const TelegramService = require('../services/telegramService');
const AIService = require('../services/aiService');
const TelegramAccount = require('../models/TelegramAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Organization = require('../models/Organization');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const { checkKeywordMatch } = require('../utils/keywordMatcher');
const creditHelper = require('../utils/creditHelper');
const { enqueueWebhook } = require('../queues/webhookQueue');

// In-memory fast deduplication cache for Telegram updates
const recentTgMessageIds = new Map();
function isDuplicateTgMessage(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (recentTgMessageIds.size > 3000) {
    for (const [k, time] of recentTgMessageIds.entries()) {
      if (now - time > 1800000) recentTgMessageIds.delete(k);
    }
  }
  if (recentTgMessageIds.has(msgId)) return true;
  recentTgMessageIds.set(msgId, now);
  return false;
}

// POST - Telegram Webhook Receiver
// Durably accepts the event into BullMQ queue or inline fallback, then acknowledges HTTP 200
exports.receiveMessage = async (req, res) => {
  try {
    const botUsername = req.params.botUsername || req.query.botUsername;
    logger.info('[TELEGRAM_WEBHOOK_RECEIVED] Incoming Telegram webhook', {
      botUsername,
      hasUpdateId: Boolean(req.body?.update_id),
    });

    const payload = {
      ...req.body,
      botUsername,
    };

    // Durably queue via BullMQ or safe fallback
    await enqueueWebhook('telegram', 'message', payload);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`[TELEGRAM_WEBHOOK_ENQUEUE_FAILED] Failed to accept webhook: ${err.message}`, { stack: err.stack });
    return res.status(500).json({ error: 'Failed to accept Telegram event' });
  }
};

// Process payload from BullMQ Worker or direct queue fallback
exports.processWebhookPayload = async (payload) => {
  let conversation = null;
  let tgAccount = null;

  try {
    const botUsername = payload?.botUsername;
    const parsed = TelegramService.parseWebhookMessage(payload);
    if (!parsed || (!parsed.text && !parsed.contact)) {
      logger.info('[TELEGRAM_WEBHOOK_IGNORED] Non-message or unsupported update type', { reason: 'UNSUPPORTED_TYPE' });
      return;
    }

    const { messageId, chatId, fromId, fromName, fromUsername, text, contact, timestamp } = parsed;

    logger.info('[TELEGRAM_MESSAGE_PARSED] Parsed Telegram update', {
      messageId,
      chatId,
      fromId,
      botUsername,
    });

    // 1. Deduplication (Memory + DB check)
    const dedupKey = `${chatId}_${messageId}`;
    if (isDuplicateTgMessage(dedupKey)) {
      logger.info('[DEDUPLICATION_MEMORY_HIT] Duplicate Telegram message in memory cache', { dedupKey });
      return;
    }

    const existingMessage = await Message.findOne({ waMessageId: messageId.toString() });
    if (existingMessage) {
      logger.info('[DEDUPLICATION_DB_HIT] Duplicate Telegram message already in Message collection', { messageId });
      return;
    }

    // 2. Find Telegram Account
    if (botUsername) {
      tgAccount = await TelegramAccount.findOne({
        botUsername,
        status: 'connected',
        isActive: true,
      }).select('+botToken');

      if (!tgAccount) {
        tgAccount = await TelegramAccount.findOne({ botUsername }).select('+botToken');
      }
    }

    // Fallback: match by connected active account
    if (!tgAccount) {
      tgAccount = await TelegramAccount.findOne({ status: 'connected', isActive: true }).select('+botToken');
    }

    if (!tgAccount) {
      logger.warn('[ACCOUNT_NOT_FOUND] No active Telegram account found for webhook', { botUsername, reason: 'ACCOUNT_NOT_FOUND' });
      return;
    }

    logger.info('[ACCOUNT_MATCHED] Telegram account matched', {
      accountId: tgAccount._id,
      botUsername: tgAccount.botUsername,
      organizationId: tgAccount.organization,
    });

    // Verify Organization is active
    const org = await Organization.findOne({ _id: tgAccount.organization, isActive: true });
    if (!org) {
      logger.warn('[ORGANIZATION_INACTIVE] Organization suspended or inactive for TG account', {
        orgId: tgAccount.organization,
        reason: 'ORG_INACTIVE',
      });
      return;
    }

    // 3. Resolve Active Agent (Flexible routing with fallbacks)
    let agent = await Agent.findOne({ telegramAccount: tgAccount._id, isActive: true }) ||
                await Agent.findOne({ organization: tgAccount.organization, platforms: 'telegram', isActive: true }) ||
                await Agent.findOne({ organization: tgAccount.organization, platform: { $in: ['telegram', 'both', 'all'] }, isActive: true }) ||
                await Agent.findOne({ organization: tgAccount.organization, isActive: true }) ||
                await Agent.findOne({ user: tgAccount.user, isActive: true });

    // 4. Find or Create Conversation
    conversation = await Conversation.findOne({
      organization: tgAccount.organization,
      platform: 'telegram',
      customerTgId: fromId.toString(),
    }).sort({ createdAt: -1 });

    const isNewConv = !conversation;
    if (!conversation) {
      conversation = await Conversation.create({
        user: tgAccount.user,
        organization: tgAccount.organization,
        agent: agent?._id || undefined,
        telegramAccount: tgAccount._id,
        platform: 'telegram',
        customerTgId: fromId.toString(),
        customerUsername: fromUsername || '',
        customerName: fromName || fromUsername || fromId.toString(),
        customerPhone: contact?.phone_number || '',
        status: 'active',
        lastMessageAt: new Date(timestamp ? timestamp * 1000 : Date.now()),
      });
      logger.info('[CONVERSATION_CREATED] New Telegram conversation created', {
        conversationId: conversation._id,
        customerTgId: fromId.toString(),
        hasAgent: Boolean(agent),
      });
    } else {
      logger.info('[CONVERSATION_FOUND] Existing Telegram conversation matched', { conversationId: conversation._id });
      if (conversation.status === 'closed') {
        conversation.status = 'active';
      }
      if (conversation.telegramAccount?.toString() !== tgAccount._id.toString()) {
        conversation.telegramAccount = tgAccount._id;
      }
      if (!conversation.agent && agent?._id) {
        conversation.agent = agent._id;
      }
      if (fromName && !conversation.customerName) conversation.customerName = fromName;
      if (fromUsername && !conversation.customerUsername) conversation.customerUsername = fromUsername;
      if (contact?.phone_number) conversation.customerPhone = contact.phone_number;
    }

    // 5. GUARANTEED PERSISTENCE OF CUSTOMER MESSAGE BEFORE AI CHECKS
    const userContent = text || (contact ? `[Contact Shared: ${contact.phone_number}]` : '[Telegram message received]');
    const persistedMsg = await conversation.addMessage({
      role: 'user',
      content: userContent,
      waMessageId: messageId.toString(),
      type: contact ? 'contacts' : 'text',
      timestamp: new Date(timestamp ? timestamp * 1000 : Date.now()),
    });
    conversation.lastMessageAt = new Date();
    conversation.isRead = false;
    await conversation.save();

    logger.info('[CUSTOMER_MESSAGE_PERSISTED] Customer message saved to database', {
      conversationId: conversation._id,
      messageDbId: persistedMsg?._id,
      waMessageId: messageId.toString(),
    });

    // 6. REAL-TIME INBOX BROADCAST (WITH ACTUAL PERSISTED MESSAGES)
    const currentMessages = await conversation.getRecentMessages();
    emitToUser(tgAccount.user.toString(), 'conversation_updated', {
      conversationId: conversation._id,
      messages: currentMessages,
      platform: 'telegram',
      customerTgId: fromId.toString(),
      customerUsername: conversation.customerUsername || fromUsername,
      customerName: conversation.customerName || fromName,
      customerPhone: conversation.customerPhone || contact?.phone_number || '',
    }, tgAccount.organization?.toString());

    emitNotification(tgAccount.user.toString(), {
      type: 'new_message',
      title: '✈️ New Telegram Message',
      message: `${conversation.customerName || fromName || fromUsername || fromId}: ${userContent.slice(0, 60)}${userContent.length > 60 ? '…' : ''}`,
      conversationId: conversation._id,
      platform: 'telegram',
    }, tgAccount.organization?.toString());

    const tgService = new TelegramService(tgAccount.botToken);

    // 7. Handle Contact Sharing
    if (contact) {
      logger.info(`[CONTACT_SHARED] Handled contact share for Telegram user ${fromId}`);
      await tgService.sendTextMessage(chatId, "Thank you! Your phone number has been verified. How can we assist you today?").catch(() => {});
      return;
    }

    // 8. Handle /start Command
    if (text === '/start') {
      const welcomeMsg = agent?.greetingMessage || "Welcome! Please let us know how we can help you today.";
      await tgService.sendTextMessage(chatId, welcomeMsg, {
        reply_markup: {
          keyboard: [[{ text: "📱 Share Mobile Number", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      }).catch(() => {});
      return;
    }

    // 9. Check Human Handoff State
    if (conversation.status === 'human_handoff') {
      logger.info('[HUMAN_HANDOFF_ACTIVE] Conversation is in human handoff; message preserved in inbox', {
        conversationId: conversation._id,
        reason: 'HUMAN_HANDOFF_ACTIVE',
      });
      return;
    }

    // 10. Check Human Handoff Keywords
    if (agent && AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
      logger.info('[HUMAN_HANDOFF_TRIGGERED] Human handoff requested via keywords', { conversationId: conversation._id });
      conversation.status = 'human_handoff';
      await conversation.addMessage({
        role: 'system',
        content: 'System: Human handoff requested. Awaiting human agent response.',
        timestamp: new Date(),
      });
      await conversation.save();

      const handoffMessages = await conversation.getRecentMessages();
      emitToUser(tgAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: handoffMessages,
        platform: 'telegram',
      }, tgAccount.organization?.toString());

      emitNotification(tgAccount.user.toString(), {
        type: 'human_handoff',
        title: 'Human Handoff Requested',
        message: `Telegram: ${conversation.customerName || fromName || fromUsername || fromId} requested human support.`,
        conversationId: conversation._id,
        platform: 'telegram',
      }, tgAccount.organization?.toString());

      const handoffMsg = agent.humanHandoffMessage || "Connecting you to a human agent. Please hold on...";
      await tgService.sendTextMessage(chatId, handoffMsg).catch(() => {});
      return;
    }

    // 11. Check Agent Eligibility
    if (!agent) {
      logger.warn('[ROUTING_NO_AGENT] No active agent configured or routed; customer message safely preserved in inbox for manual reply', {
        conversationId: conversation._id,
        organizationId: tgAccount.organization,
        reason: 'NO_ACTIVE_AGENT',
      });
      return;
    }

    logger.info('[AGENT_SELECTED] Active agent eligible for Telegram conversation', {
      agentId: agent._id,
      agentName: agent.name,
    });

    // 12. Check User Credits and Plan Limits
    let creditCost = 1;
    const user = await User.findById(tgAccount.user).select('+usage +subscription');
    if (user) {
      const Plan = require('../models/Plan');
      const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
      creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

      if ((user.subscription?.credits ?? 0) < creditCost) {
        logger.warn('[CREDIT_LIMIT_REACHED] User out of credits for Telegram AI response; message preserved for manual reply', {
          userId: user._id,
          reason: 'INSUFFICIENT_CREDITS',
        });
        emitNotification(tgAccount.user.toString(), {
          type: 'system_alert',
          title: 'AI Credits Exhausted',
          message: 'Telegram AI response paused: insufficient credits. Please recharge.',
          conversationId: conversation._id,
          platform: 'telegram',
        }, tgAccount.organization?.toString());
        return;
      }

      const limits = await user.getPlanLimits();
      if (user.usage?.messagesThisMonth >= limits.messages) {
        logger.warn('[PLAN_LIMIT_REACHED] User hit monthly message limit; message preserved for manual reply', {
          userId: user._id,
          reason: 'MONTHLY_LIMIT_EXCEEDED',
        });
        return;
      }
      logger.info('[CREDIT_CHECK_PASSED] User has sufficient credits and quota for Telegram AI response');
    }

    // 13. Check Business Hours
    const withinHours = AIService.isWithinBusinessHours(agent.businessHours);
    if (!withinHours && agent.outOfHoursMessage) {
      logger.info('[OUT_OF_HOURS] Telegram message received outside business hours', { conversationId: conversation._id });
      await tgService.sendTextMessage(chatId, agent.outOfHoursMessage).catch(() => {});
      return;
    }

    // 14. Check Keyword Triggers
    const matchedTrigger = await checkKeywordMatch(tgAccount.organization, text, 'telegram', 'DM', agent._id);
    if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
      logger.info(`[KEYWORD_TRIGGER_MATCHED] Matched keyword trigger ${matchedTrigger._id} for Telegram user ${fromId}`);
      let sentMsg;
      try {
        if (matchedTrigger.mediaType === 'image' && matchedTrigger.mediaUrl) {
          sentMsg = await tgService.sendPhoto(chatId, matchedTrigger.mediaUrl, matchedTrigger.response);
        } else if (matchedTrigger.mediaType === 'video' && matchedTrigger.mediaUrl) {
          sentMsg = await tgService.sendVideo(chatId, matchedTrigger.mediaUrl, matchedTrigger.response);
        } else {
          sentMsg = await tgService.sendTextMessage(chatId, matchedTrigger.response);
        }

        await conversation.addMessage({
          role: 'assistant',
          content: matchedTrigger.response || '[Media Sent]',
          waMessageId: sentMsg?.result?.message_id?.toString(),
          type: matchedTrigger.mediaType !== 'none' ? matchedTrigger.mediaType : 'text',
          media: matchedTrigger.mediaUrl ? { url: matchedTrigger.mediaUrl } : null,
          status: 'sent',
          tokens: 0,
        });

        logger.info('[KEYWORD_REPLY_PERSISTED] Telegram keyword response sent and saved to inbox');
        const updatedMessages = await conversation.getRecentMessages();
        emitToUser(tgAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: updatedMessages,
          platform: 'telegram',
        }, tgAccount.organization?.toString());
      } catch (triggerErr) {
        logger.error(`[KEYWORD_SEND_FAILED] Failed to send Telegram keyword response: ${triggerErr.message}`);
      }
      return;
    }

    // 15. Context Preparation & AI Generation
    const contextMessages = (await conversation.getRecentMessages(20))
      .filter((m) => m.role !== 'system')
      .slice(-(agent.contextWindow * 2))
      .map((m) => ({ role: m.role, content: m.content }));

    // Send typing indicator
    await tgService.sendAction(chatId, 'typing').catch(() => {});
    emitToUser(tgAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: true }, tgAccount.organization?.toString());

    logger.info('[AI_ORCHESTRATION_STARTED] Starting AI response generation for Telegram', {
      conversationId: conversation._id,
      agentId: agent._id,
      contextCount: contextMessages.length,
    });

    let aiResult = null;
    try {
      aiResult = await AIService.generate(agent, contextMessages.slice(0, -1), text, 'telegram');
    } catch (aiErr) {
      logger.error(`[AI_ORCHESTRATION_FAILED] AIService error for Telegram: ${aiErr.message}`, {
        conversationId: conversation._id,
        reason: 'AI_ORCHESTRATION_ERROR',
      });
    } finally {
      emitToUser(tgAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false }, tgAccount.organization?.toString());
    }

    if (!aiResult || !aiResult.content) {
      logger.warn('[AI_GENERATION_EMPTY] AI returned empty or null content for Telegram message; message preserved without fabricating reply', {
        conversationId: conversation._id,
        reason: 'EMPTY_AI_RESPONSE',
      });
      return;
    }

    const cleanReply = AIService.sanitizeForPlatform(aiResult.content, 'telegram') || "Sorry, I am unable to process that right now.";

    // 16. Outbound Send to Telegram API
    let sentMsg = null;
    let sendFailed = false;
    try {
      sentMsg = await tgService.sendTextMessage(chatId, cleanReply);
      logger.info('[TELEGRAM_SEND_SUCCESS] Outbound message sent to Telegram API', {
        messageId: sentMsg?.result?.message_id,
        chatId,
      });
    } catch (sendErr) {
      sendFailed = true;
      const sanitizedStatus = sendErr.response?.status || sendErr.status || 500;
      const sanitizedCode = sendErr.response?.data?.error_code || 'TELEGRAM_ERROR';
      const sanitizedMsg = sendErr.response?.data?.description || sendErr.message;
      logger.error('[TELEGRAM_SEND_FAILED] Telegram Send API failed', {
        status: sanitizedStatus,
        errorCode: sanitizedCode,
        errorMessage: sanitizedMsg,
        conversationId: conversation._id,
      });
    }

    // 17. PERSIST ASSISTANT REPLY ONLY IF SEND SUCCEEDED
    if (!sendFailed && sentMsg) {
      const assistantMsg = await conversation.addMessage({
        role: 'assistant',
        content: cleanReply,
        waMessageId: sentMsg?.result?.message_id?.toString(),
        type: 'text',
        status: 'sent',
        tokens: aiResult.tokensUsed || 0,
        responseTime: aiResult.responseTime || 0,
      });

      conversation.totalMessages = (conversation.totalMessages || 0) + 2;
      conversation.totalTokensUsed = (conversation.totalTokensUsed || 0) + (aiResult.tokensUsed || 0);
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      logger.info('[ASSISTANT_REPLY_PERSISTED] Telegram assistant reply saved to database', {
        conversationId: conversation._id,
        messageId: assistantMsg?._id,
      });

      // Real-time inbox update with both messages
      const updatedMessages = await conversation.getRecentMessages();
      emitToUser(tgAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: updatedMessages,
        platform: 'telegram',
        customerTgId: fromId.toString(),
        customerUsername: conversation.customerUsername,
        customerName: conversation.customerName,
      }, tgAccount.organization?.toString());

      emitNotification(tgAccount.user.toString(), {
        type: 'new_message',
        title: '✈️ New Telegram Message',
        message: `${conversation.customerName || fromName || fromUsername || fromId}: ${userContent.slice(0, 60)}${userContent.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'telegram',
      }, tgAccount.organization?.toString());

      // Deduct credits & log transaction
      await creditHelper.deductCredits(tgAccount.user, creditCost).catch(() => {});
      await creditHelper.logTransaction({
        userId: tgAccount.user,
        type: 'deduction',
        amount: creditCost,
        description: `AI Agent: Telegram reply to ${fromName || fromUsername || fromId}`,
        metadata: { conversationId: conversation._id, platform: 'telegram' },
      }).catch(() => {});

      // Update agent stats
      await Agent.findByIdAndUpdate(agent._id, {
        $inc: {
          'stats.totalMessages': 2,
          'stats.totalConversations': conversation.totalMessages === 2 ? 1 : 0,
        },
      }).catch(() => {});

      logger.info(`[PIPELINE_COMPLETE] Telegram AI reply cycle completed for ${fromId}`);
    } else if (sendFailed) {
      logger.warn('[ASSISTANT_REPLY_SKIPPED] Telegram assistant reply not persisted because API send failed. Customer message remains intact for manual reply.', {
        conversationId: conversation._id,
      });
    }

  } catch (err) {
    if (conversation?._id && tgAccount?.user) {
      emitToUser(tgAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false }, tgAccount.organization?.toString());
    }
    logger.error(`[TELEGRAM_PIPELINE_ERROR] Error processing Telegram webhook task: ${err.message}`, { stack: err.stack });
    throw err;
  }
};
