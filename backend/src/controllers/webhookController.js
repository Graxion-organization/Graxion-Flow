const WhatsAppService = require('../services/whatsappService');
const AIService = require('../services/aiService');
const WhatsappAccount = require('../models/WhatsappAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const creditHelper = require('../utils/creditHelper');
const { enqueueWebhook } = require('../queues/webhookQueue');
const { generateSpeech, deleteTempAudio, transcribeAudio } = require('../utils/audioHelper');
const CloudinaryService = require('../services/cloudinaryService');
const { checkKeywordMatch } = require('../utils/keywordMatcher');
const conversationPricingService = require('../services/conversationPricingService');
const Template = require('../models/Template');
const DealAutomationService = require('../services/dealAutomationService');
const path = require('path');
const os = require('os');

const isVoiceRequest = (message) => {
  if (!message) return false;
  const keywords = [
    'voice',
    'audio',
    'recording',
    'awaz',
    'aawaz',
    'bol',
    'bolke',
    'bol ke',
    'sunao',
    'voice note',
    'audio me',
    'voice me',
  ];
  const lowerMsg = message.toLowerCase();
  return keywords.some((kw) => lowerMsg.includes(kw));
};

// GET - Webhook verification from Meta
exports.verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'] || req.query['hub_mode'];
    const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
    const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];
    const result = await WhatsAppService.verifyWebhook(mode, token, challenge);
    logger.info('[WEBHOOK_VERIFIED] Meta verification challenge passed');
    res.status(200).send(result);
  } catch (err) {
    logger.warn('[WEBHOOK_VERIFY_FAILED] Meta verification failed: ' + err.message);
    res.status(403).send('Forbidden');
  }
};

// In-memory deduplication & in-flight tracking
// Only completed/skipped messages are stored in completedMessageIds so failed messages can be retried
const completedMessageIds = new Map();
const inFlightMessageIds = new Set();

function isCompletedInMemory(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (completedMessageIds.size > 3000) {
    for (const [k, time] of completedMessageIds.entries()) {
      if (now - time > 1800000) completedMessageIds.delete(k);
    }
  }
  return completedMessageIds.has(msgId);
}

function markMessageCompleted(msgId) {
  if (!msgId) return;
  completedMessageIds.set(msgId, Date.now());
}

async function updateMessageProcessingState(msgDoc, updates) {
  if (!msgDoc) return;
  Object.assign(msgDoc, updates);
  if (typeof msgDoc.save === 'function') {
    try {
      await msgDoc.save();
    } catch (saveErr) {
      logger.warn(`Failed to update message processing state: ${saveErr.message}`);
    }
  }
}

// POST - Receive incoming messages
// Durably queues the event or accepts via fallback before responding
exports.receiveMessage = async (req, res) => {
  try {
    logger.info('[WEBHOOK_RECEIVED] WhatsApp webhook received', {
      entriesCount: req.body?.entry?.length || 0,
      object: req.body?.object
    });

    // Enqueue webhook to durable BullMQ queue or inline fallback
    await enqueueWebhook('whatsapp', 'message', req.body);
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`[WEBHOOK_ENQUEUE_FAILED] Failed to queue WhatsApp webhook: ${err.message}`, {
      service: 'webhookController',
      provider: 'whatsapp',
      stage: 'webhook_enqueue',
      stack: err.stack
    });
    return res.status(500).json({ error: 'Failed to accept webhook event' });
  }
};

// Process a single parsed WhatsApp webhook event
async function processSingleWebhookEvent(parsed, options = {}) {
  // 1. Handle Status Updates (sent, delivered, read, failed)
  if (parsed.isStatusUpdate) {
    const { messageId, status } = parsed;
    logger.info('[STATUS_WEBHOOK_RECEIVED] Meta message status update', { messageId, status });

    const updatedMsg = await Message.findOneAndUpdate(
      { waMessageId: messageId },
      { $set: { status } },
      { new: true }
    );

    if (updatedMsg) {
      const conv = await Conversation.findById(updatedMsg.conversationId);
      if (conv) {
        const recent = await conv.getRecentMessages();
        emitToUser(conv.user.toString(), 'conversation_updated', {
          conversationId: conv._id,
          messages: recent,
        }, conv.organization?.toString());

        if (parsed.pricing && conv.organization) {
          await conversationPricingService.processPricingWebhook(conv.organization, parsed.pricing, parsed.timestamp);
        }
      }
    }

    // Track Broadcast Message Status
    try {
      const BroadcastMessage = require('../models/BroadcastMessage');
      const Broadcast = require('../models/Broadcast');
      const bMsg = await BroadcastMessage.findOne({ messageId });

      if (bMsg && bMsg.status !== status) {
        bMsg.status = status;
        if (parsed.reason) {
          bMsg.errorReason = parsed.reason;
          if (status === 'failed') {
            logger.error(`[META_STATUS_FAILED] Broadcast message ${messageId} failed. Reason: ${parsed.reason}`, {
              service: 'webhookController',
              provider: 'whatsapp',
              messageId,
              stage: 'broadcast_status_update'
            });
          }
        }
        await bMsg.save();

        const incQuery = {};
        if (status === 'delivered') incQuery.deliveredCount = 1;
        else if (status === 'read') incQuery.readCount = 1;
        else if (status === 'failed') incQuery.failedCount = 1;

        if (Object.keys(incQuery).length > 0) {
          const updatedBroadcast = await Broadcast.findByIdAndUpdate(
            bMsg.broadcast,
            { $inc: incQuery },
            { new: true }
          );

          if (status === 'failed' && updatedBroadcast && updatedBroadcast.status === 'COMPLETED') {
            if (updatedBroadcast.sentCount > 0 && updatedBroadcast.failedCount >= updatedBroadcast.sentCount) {
              updatedBroadcast.status = 'FAILED';
              await updatedBroadcast.save();
            }
          }
        }
      }
    } catch (err) {
      logger.error(`Error updating broadcast message status for ${messageId}: ${err.message}`, {
        service: 'webhookController',
        provider: 'whatsapp',
        messageId,
        stage: 'broadcast_status_update'
      });
    }

    return;
  }

  // 2. Handle Template Status Updates
  if (parsed.isTemplateStatusUpdate) {
    logger.info(`[TEMPLATE_STATUS_UPDATE] Meta template update: ${parsed.templateName} -> ${parsed.status}`);
    await Template.findOneAndUpdate(
      { name: parsed.templateName },
      { status: parsed.status, rejectReason: parsed.reason }
    );
    return;
  }

  // 3. Handle Account Quality Updates
  if (parsed.isAccountUpdate) {
    logger.warn(`[ACCOUNT_STATUS_UPDATE] Meta account update for ${parsed.phoneNumberId}: ${parsed.event_update || parsed.decision}`);
    const waAccount = await WhatsappAccount.findOne({ phoneNumberId: parsed.phoneNumberId });
    if (waAccount) {
      waAccount.qualityRating = parsed.event_update?.quality_rating || waAccount.qualityRating;
      waAccount.accountStatus = parsed.event_update?.status || waAccount.accountStatus;
      await waAccount.save();

      if (waAccount.qualityRating === 'YELLOW' || waAccount.qualityRating === 'RED') {
        emitNotification(waAccount.user.toString(), {
          type: 'system_alert',
          title: 'WhatsApp Quality Drop',
          message: `Account quality rating dropped to ${waAccount.qualityRating}. Please review outbound messaging.`,
          platform: 'whatsapp'
        }, waAccount.organization?.toString());
      }
    }
    return;
  }

  // 4. Validate Allowed Message Types
  const allowedTypes = [
    'text',
    'audio',
    'image',
    'document',
    'video',
    'sticker',
    'reaction',
    'location',
    'contacts',
    'interactive',
  ];
  if (!allowedTypes.includes(parsed.type)) {
    logger.info(`[WEBHOOK_REJECTED] Unsupported message type: ${parsed.type}`, { reason: 'UNSUPPORTED_TYPE' });
    return;
  }

  const {
    phoneNumberId,
    from,
    customerName,
    messageId,
    text,
    timestamp,
    type,
    audioId,
    imageId,
    documentId,
    videoId,
    stickerId,
    reaction,
    location,
    contacts,
    buttonReply,
    listReply,
  } = parsed;

  let conversation = null;
  let waAccount = null;
  let persistedCustomerMessage = null;

  // 5. In-memory and Database Deduplication (with incomplete AI retry resumption)
  if (isCompletedInMemory(messageId)) {
    logger.info('[DEDUPLICATION_MEMORY_HIT] Message is already in memory cache. Skipping.', { messageId });
    return;
  }

  if (messageId && inFlightMessageIds.has(messageId)) {
    logger.info('[DEDUPLICATION_IN_FLIGHT] Message is currently being processed. Skipping concurrent duplicate.', { messageId });
    return;
  }

  if (messageId) {
    inFlightMessageIds.add(messageId);
  }

  try {
    const existingMessage = messageId ? await Message.findOne({ waMessageId: messageId }) : null;
    if (existingMessage) {
      const status = existingMessage.processingStatus;
      const isIncomplete =
        (status === 'saved' || status === 'failed' || status === 'processing') &&
        !existingMessage.aiReplyMessageId;

      if (!isIncomplete) {
        markMessageCompleted(messageId);
        logger.info('[DEDUPLICATION_DB_HIT] Message already exists in Message collection. Skipping.', { messageId });
        return;
      }

      persistedCustomerMessage = existingMessage;
      logger.info('[AI_RETRY_RESUMED] Resuming incomplete AI processing for persisted customer message', {
        messageId,
        previousStatus: status,
        attempts: existingMessage.processingAttempts || 0
      });
    }

    // 6. Match WhatsApp Account
    waAccount = await WhatsappAccount.findOne({
      phoneNumberId,
      status: 'connected',
      isActive: true,
    }).select('+accessToken');

    if (!waAccount) {
      waAccount = await WhatsappAccount.findOne({ phoneNumberId }).select('+accessToken');
    }

    if (!waAccount) {
      waAccount = await WhatsappAccount.findOne({ isActive: true }).select('+accessToken');
      if (waAccount) {
        logger.info(`[ACCOUNT_MATCHED_FALLBACK] Matched single active WhatsApp account ${waAccount.phoneNumberId}`);
      }
    }

    if (!waAccount) {
      logger.warn(`[ACCOUNT_NOT_FOUND] No active WhatsApp account found for phoneNumberId: ${phoneNumberId}`, {
        reason: 'ACCOUNT_NOT_FOUND',
        phoneNumberId
      });
      return;
    }

    logger.info('[ACCOUNT_MATCHED] WhatsApp account matched successfully', {
      accountId: waAccount._id,
      phoneNumberId: waAccount.phoneNumberId,
      organizationId: waAccount.organization
    });

    const waService = new WhatsAppService(decrypt(waAccount.accessToken), phoneNumberId);

    // 7. Parse Media & Content
    let mediaData = null;
    if (type === 'audio' && audioId) mediaData = { audioId };
    if (type === 'image' && imageId) mediaData = { imageId };
    if (type === 'document' && documentId) mediaData = { documentId };
    if (type === 'video' && videoId) mediaData = { videoId };
    if (type === 'sticker' && stickerId) mediaData = { stickerId };
    if (type === 'reaction' && reaction) mediaData = { reaction };
    if (type === 'location' && location) mediaData = { location };
    if (type === 'contacts' && contacts) mediaData = { contacts };
    if (type === 'interactive') {
      if (buttonReply) mediaData = { buttonReply };
      if (listReply) mediaData = { listReply };
    }

    let userMessageText = text;
    let isAudioRequest = false;

    if (type === 'audio' && audioId) {
      logger.info(`[MEDIA_AUDIO_INCOMING] Audio message from ${from}. Downloading and transcribing...`);
      try {
        const mediaUrl = await waService.getMediaUrl(audioId);
        const tempAudioPath = path.join(os.tmpdir(), `incoming_${audioId}.ogg`);
        await waService.downloadMedia(mediaUrl, tempAudioPath);
        userMessageText = await transcribeAudio(tempAudioPath);
        await deleteTempAudio(tempAudioPath);
        logger.info(`[AUDIO_TRANSCRIBED] Transcribed audio text: ${userMessageText}`);
        isAudioRequest = true;
      } catch (sttError) {
        logger.error(`[AUDIO_TRANSCRIPTION_FAILED] Failed to transcribe incoming audio: ${sttError.message}`, {
          service: 'webhookController',
          provider: 'whatsapp',
          workspaceId: waAccount.organization,
          userId: waAccount.user,
          messageId,
          stage: 'audio_transcription'
        });
        userMessageText = '[Voice note received]';
      }
    } else if (type === 'image' && imageId) {
      userMessageText = text || '[Image received]';
      try {
        const mediaUrl = await waService.getMediaUrl(imageId);
        mediaData = { type: 'image', url: mediaUrl, id: imageId };
      } catch (err) {
        logger.error('Failed to process image:', err.message);
      }
    } else if (type === 'document' && documentId) {
      userMessageText = text || '[Document received]';
      try {
        const mediaUrl = await waService.getMediaUrl(documentId);
        mediaData = { type: 'document', url: mediaUrl, id: documentId };
      } catch (err) {
        logger.error('Failed to process document:', err.message);
      }
    } else if (type === 'location' && location) {
      userMessageText = `[Location received: ${location.latitude}, ${location.longitude}]`;
      mediaData = { type: 'location', data: location };
    } else if (type === 'interactive' && buttonReply) {
      userMessageText = buttonReply.title;
    } else if (type === 'interactive' && listReply) {
      userMessageText = listReply.title;
    }

    if (!userMessageText && !mediaData) {
      logger.warn('[REJECTED_EMPTY_CONTENT] Message has no text and no media', { reason: 'EMPTY_CONTENT' });
      return;
    }
    if (!userMessageText) userMessageText = `[${type} received]`;

    // 8. Find Active Agent for this Account / Organization
    let agent = await Agent.findOne({ organization: waAccount.organization, isActive: true }) ||
                await Agent.findOne({ whatsappAccounts: waAccount._id, isActive: true }) ||
                await Agent.findOne({ whatsappAccount: waAccount._id, isActive: true }) ||
                await Agent.findOne({ user: waAccount.user, isActive: true }) ||
                await Agent.findOne({ isActive: true });

    // 9. Find or Create Conversation
    conversation = await Conversation.findOne({
      organization: waAccount.organization,
      platform: 'whatsapp',
      customerPhone: from,
    }).sort({ createdAt: -1 });

    const isNewConversation = !conversation;
    if (!conversation) {
      conversation = await Conversation.create({
        user: waAccount.user,
        organization: waAccount.organization,
        agent: agent?._id || undefined,
        whatsappAccount: waAccount._id,
        customerPhone: from,
        customerName: customerName || from,
        customerWaId: from,
        status: 'active',
        lastMessageAt: new Date(),
      });
      logger.info('[CONVERSATION_CREATED] New conversation created', {
        conversationId: conversation._id,
        agentId: agent?._id || null,
        hasAgent: Boolean(agent)
      });
    } else {
      logger.info('[CONVERSATION_FOUND] Existing conversation matched', { conversationId: conversation._id });
      if (conversation.status === 'closed') {
        conversation.status = 'active';
      }
      if (conversation.whatsappAccount?.toString() !== waAccount._id.toString()) {
        conversation.whatsappAccount = waAccount._id;
      }
      if (!conversation.agent && agent?._id) {
        conversation.agent = agent._id;
      }
    }

    // 10. GUARANTEED PERSISTENCE OF CUSTOMER MESSAGE BEFORE AI GENERATION
    if (!persistedCustomerMessage) {
      persistedCustomerMessage = await conversation.addMessage({
        role: 'user',
        content: userMessageText,
        waMessageId: messageId,
        type: type || 'text',
        media: mediaData,
        processingStatus: 'saved',
        processingAttempts: 0,
        timestamp: new Date(parseInt(timestamp) * 1000 || Date.now()),
      });
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      logger.info('[CUSTOMER_MESSAGE_PERSISTED] Customer message saved to database', {
        conversationId: conversation._id,
        messageDbId: persistedCustomerMessage?._id,
        waMessageId: messageId
      });

      // 11. REAL-TIME ZERO-LATENCY INBOX BROADCAST (WITH ACTUAL PERSISTED MESSAGES)
      const currentMessages = await conversation.getRecentMessages();
      emitToUser(waAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: currentMessages,
        platform: 'whatsapp',
        customerPhone: conversation.customerPhone || from,
        customerName: conversation.customerName || customerName,
      }, waAccount.organization?.toString());

      emitNotification(waAccount.user.toString(), {
        type: 'new_message',
        title: 'New WhatsApp Message',
        message: `${conversation.customerName || from}: ${userMessageText.slice(0, 60)}${userMessageText.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'whatsapp',
      }, waAccount.organization?.toString());
    }

    // 12. TRAI DND Opt-Out Check
    const optOutKeywords = ['stop', 'cancel', 'unsubscribe', 'dnd'];
    if (optOutKeywords.includes(userMessageText.trim().toLowerCase())) {
      logger.info('[OPT_OUT_TRIGGERED] Opt-out keyword received from customer', { from });
      const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
      if (contact) {
        contact.isOptedIn = false;
        await contact.save();
      }
      await waService.sendTextMessage(
        from,
        "You have been successfully opted out of our messages. You will no longer receive broadcasts. Reply 'START' to opt back in at any time."
      ).catch(() => {});
      await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
      markMessageCompleted(messageId);
      return;
    }

    // Opt-in logic
    if (['start', 'resume', 'opt in'].includes(userMessageText.trim().toLowerCase())) {
      logger.info('[OPT_IN_TRIGGERED] Opt-in keyword received from customer', { from });
      const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
      if (contact && !contact.isOptedIn) {
        contact.isOptedIn = true;
        await contact.save();
        await waService.sendTextMessage(from, 'You have successfully opted back in. Welcome back!').catch(() => {});
        await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
        markMessageCompleted(messageId);
        return;
      }
    }

    // 13. Check Human Handoff State
    if (conversation.status === 'human_handoff') {
      logger.info('[HUMAN_HANDOFF_ACTIVE] Conversation in human handoff; message preserved for agent in inbox', {
        conversationId: conversation._id,
        reason: 'HUMAN_HANDOFF_ACTIVE'
      });
      await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
      markMessageCompleted(messageId);
      return;
    }

    // 14. Check Human Handoff Triggers across active agents
    const activeAgents = await Agent.find({ organization: waAccount.organization, isActive: true });
    const combinedHandoffKeywords = [...new Set(activeAgents.flatMap(a => a.humanHandoffKeywords || []))];

    if (AIService.shouldHandoffToHuman(userMessageText, combinedHandoffKeywords)) {
      logger.info('[HUMAN_HANDOFF_TRIGGERED] Customer message triggered human handoff keywords', {
        conversationId: conversation._id
      });
      conversation.status = 'human_handoff';
      await conversation.addMessage({
        role: 'system',
        content: 'System: Human handoff requested. Awaiting human agent response.',
        timestamp: new Date(),
      });
      await conversation.save();

      const handoffMessages = await conversation.getRecentMessages();
      emitToUser(waAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: handoffMessages,
      }, waAccount.organization?.toString());

      emitNotification(waAccount.user.toString(), {
        type: 'human_handoff',
        title: 'Human Handoff Requested',
        message: `WhatsApp: ${customerName || from} requested human support.`,
        conversationId: conversation._id,
        platform: 'whatsapp',
      }, waAccount.organization?.toString());

      await waService.sendTextMessage(from, 'Connecting you to a human agent...').catch(() => {});
      await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
      markMessageCompleted(messageId);
      return;
    }

    // 15. Check Agent Eligibility
    if (!agent) {
      logger.warn('[ROUTING_NO_AGENT] No active agent configured or routed; customer message safely preserved in inbox for manual reply', {
        conversationId: conversation._id,
        organizationId: waAccount.organization,
        reason: 'NO_ACTIVE_AGENT'
      });
      await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
      markMessageCompleted(messageId);
      return;
    }

    logger.info('[AGENT_SELECTED] Active agent eligible for conversation', {
      agentId: agent._id,
      agentName: agent.name
    });

    // Send initial greeting if brand new conversation
    if (isNewConversation && (conversation.messageCount || 0) <= 1 && agent.greetingMessage) {
      await waService.sendTextMessage(from, agent.greetingMessage).catch(err => {
        logger.warn(`Failed to send agent greeting message: ${err.message}`);
      });
    }

    // 16. Check User Message limit & Credits
    let creditCost = 1;
    const user = await User.findById(waAccount.user).select('+usage +subscription');
    if (user) {
      const Plan = require('../models/Plan');
      const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
      creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

      if ((user.subscription?.credits ?? 0) < creditCost) {
        logger.warn(`[CREDIT_LIMIT_REACHED] User ${user._id} out of credits for AI response. Message preserved for manual reply.`, {
          reason: 'INSUFFICIENT_CREDITS'
        });
        emitNotification(waAccount.user.toString(), {
          type: 'system_alert',
          title: 'AI Credits Exhausted',
          message: 'WhatsApp AI response paused: insufficient credits. Please recharge.',
          conversationId: conversation._id,
          platform: 'whatsapp'
        }, waAccount.organization?.toString());
        await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
        markMessageCompleted(messageId);
        return;
      }

      const limits = await user.getPlanLimits();
      if (user.usage?.messagesThisMonth >= limits.messages) {
        logger.warn(`[PLAN_LIMIT_REACHED] User ${user._id} hit monthly message limit. Message preserved for manual reply.`, {
          reason: 'MONTHLY_LIMIT_EXCEEDED'
        });
        await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'skipped' });
        markMessageCompleted(messageId);
        return;
      }
      logger.info('[CREDIT_CHECK_PASSED] User has sufficient credits and quota for AI response');
    }

    // 17. Check Flow Engine (AI-003)
    const FlowEngine = require('../services/flowEngine');
    const handledByFlow = await FlowEngine.handleIncomingMessage(waAccount, from, userMessageText);
    if (handledByFlow) {
      logger.info(`[FLOW_ENGINE_DECISION] Message handled by flow engine. Bypassing AI orchestration.`, {
        from,
        reason: 'FLOW_HANDLED'
      });
      await waService.markAsRead(messageId).catch(() => {});
      await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'completed' });
      markMessageCompleted(messageId);
      return;
    }
    logger.info('[FLOW_ENGINE_DECISION] Flow engine bypassed, proceeding to AI orchestration');

    // 18. Build Context Window
    const contextMessages = (await conversation.getRecentMessages(20))
      .filter((m) => m.role !== 'system')
      .slice(-((agent.contextWindow || 10) * 2))
      .map((m) => ({ role: m.role, content: m.content }));

    const wantsVoice = isVoiceRequest(userMessageText) || isAudioRequest;

    // 19. Check Keyword Triggers (WA-011)
    const matchedTrigger = await checkKeywordMatch(waAccount.organization, userMessageText, 'whatsapp', 'DM', agent?._id);
    if (matchedTrigger) {
      await waService.markAsRead(messageId).catch(() => {});
      logger.info(`[KEYWORD_TRIGGER_MATCHED] Matched trigger ${matchedTrigger._id} for ${from}`);

      if (matchedTrigger.action === 'SEND_MESSAGE') {
        let sentMsg;
        try {
          if (matchedTrigger.mediaType === 'image' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendImageMessage(from, matchedTrigger.mediaUrl, matchedTrigger.response);
          } else if (matchedTrigger.mediaType === 'video' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendVideoMessage(from, matchedTrigger.mediaUrl, matchedTrigger.response);
          } else if (matchedTrigger.mediaType === 'audio' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendAudioMessage(from, matchedTrigger.mediaUrl);
            if (matchedTrigger.response) {
              await waService.sendTextMessage(from, matchedTrigger.response);
            }
          } else if (matchedTrigger.mediaType === 'document' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendDocumentMessage(from, matchedTrigger.mediaUrl, 'document', matchedTrigger.response);
          } else {
            sentMsg = await waService.sendTextMessage(from, matchedTrigger.response);
          }

          const kwMsg = await conversation.addMessage({
            role: 'assistant',
            content: matchedTrigger.response || '[Media Sent]',
            waMessageId: sentMsg?.messages?.[0]?.id,
            type: matchedTrigger.mediaType !== 'none' ? matchedTrigger.mediaType : 'text',
            media: matchedTrigger.mediaUrl ? { url: matchedTrigger.mediaUrl } : null,
            status: 'sent',
          });
          await updateMessageProcessingState(persistedCustomerMessage, {
            processingStatus: 'completed',
            aiReplyMessageId: kwMsg?._id?.toString() || sentMsg?.messages?.[0]?.id
          });
          markMessageCompleted(messageId);
          logger.info('[KEYWORD_REPLY_PERSISTED] Keyword response sent and saved to inbox');
        } catch (triggerSendErr) {
          await updateMessageProcessingState(persistedCustomerMessage, {
            processingStatus: 'failed',
            processingError: triggerSendErr.message
          });
          logger.error(`[KEYWORD_SEND_FAILED] Failed to send keyword response: ${triggerSendErr.message}`, {
            service: 'webhookController',
            provider: 'whatsapp',
            conversationId: conversation._id,
            messageId
          });
          if (options.throwOnError) throw triggerSendErr;
        }
        return;
      }
    }

    // 20. AI Orchestration
    await updateMessageProcessingState(persistedCustomerMessage, {
      processingStatus: 'processing',
      processingAttempts: (persistedCustomerMessage?.processingAttempts || 0) + 1
    });

    const OrchestrationEngine = require('../services/orchestrationEngine');
    await waService.markAsRead(messageId).catch(() => {});
    emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: true }, waAccount.organization?.toString());

    logger.info('[AI_ORCHESTRATION_STARTED] Starting AI response generation', {
      conversationId: conversation._id,
      agentId: agent._id,
      contextLength: contextMessages.length
    });

    let aiResult = null;
    let aiOrchestrationError = null;
    try {
      aiResult = await OrchestrationEngine.execute({
        organizationId: waAccount.organization,
        conversation,
        userMessageText,
        contextMessages: contextMessages.slice(0, -1),
        from,
        wantsVoice
      });
    } catch (aiErr) {
      aiOrchestrationError = aiErr;
      logger.error(`[AI_ORCHESTRATION_FAILED] OrchestrationEngine error: ${aiErr.message}`, {
        conversationId: conversation._id,
        workspaceId: waAccount.organization,
        userId: waAccount.user,
        messageId,
        service: 'orchestrationEngine',
        provider: 'openai',
        stage: 'ai_orchestration',
        reason: 'AI_ORCHESTRATION_ERROR'
      });
    } finally {
      emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false }, waAccount.organization?.toString());
    }

    if (aiOrchestrationError) {
      await updateMessageProcessingState(persistedCustomerMessage, {
        processingStatus: 'failed',
        processingError: aiOrchestrationError.message
      });
      if (options.throwOnError) throw aiOrchestrationError;
      return;
    }

    if (!aiResult || !aiResult.content) {
      logger.warn(`[AI_GENERATION_EMPTY] AI returned null/empty content; customer message preserved in inbox without fabricating reply`, {
        conversationId: conversation._id,
        reason: 'EMPTY_AI_RESPONSE'
      });
      await updateMessageProcessingState(persistedCustomerMessage, {
        processingStatus: 'failed',
        processingError: 'EMPTY_AI_RESPONSE'
      });
      if (options.throwOnError) {
        throw new Error('AI returned empty content');
      }
      return;
    }

    logger.info('[AI_ORCHESTRATION_COMPLETED] AI response generated successfully', {
      conversationId: conversation._id,
      responseLength: aiResult.content.length,
      tokensUsed: aiResult.tokensUsed
    });

    const targetAgent = aiResult.agent || agent;

    // 21. Business Hours Check
    if (targetAgent) {
      const withinHours = AIService.isWithinBusinessHours(targetAgent.businessHours);
      if (!withinHours && targetAgent.outOfHoursMessage) {
        logger.info('[OUT_OF_HOURS] Message received outside business hours. Sending outOfHoursMessage.');
        await waService.sendTextMessage(from, targetAgent.outOfHoursMessage).catch(() => {});
        await updateMessageProcessingState(persistedCustomerMessage, { processingStatus: 'completed' });
        markMessageCompleted(messageId);
        return;
      }
    }

    // 22. Sanitize Response for WhatsApp
    let cleanReply = AIService.sanitizeForWhatsApp(aiResult.content) || 'Sorry, something went wrong.';
    let detectedLanguage = 'hi-IN';

    const langMatch = cleanReply.match(/\[LANG:\s*([a-zA-Z-]+)\]/i);
    if (langMatch) {
      detectedLanguage = langMatch[1];
      cleanReply = cleanReply.replace(langMatch[0], '').trim();
      aiResult.content = aiResult.content.replace(langMatch[0], '').trim();
    }

    await waService.markAsRead(messageId).catch(() => {});

    let sentMsg = null;
    let audioSent = false;
    let sendFailed = false;
    let lastSendError = null;

    // 23. Send Voice Message if requested & configured
    if (wantsVoice && targetAgent?.elevenLabsVoiceId) {
      try {
        logger.info(`[VOICE_GENERATION_STARTED] Voice intent detected for ${from}. Generating audio with language ${detectedLanguage}...`);
        const localAudioPath = await generateSpeech(cleanReply, detectedLanguage);
        const uploadResult = await CloudinaryService.upload(localAudioPath, {
          resource_type: 'video',
          folder: 'whatsapp_tts',
        });

        sentMsg = await waService.sendAudioMessage(from, uploadResult.url);
        audioSent = true;
        logger.info(`[META_SEND_SUCCESS] Audio reply sent to Meta API for ${from}`, {
          metaMessageId: sentMsg?.messages?.[0]?.id
        });
        await deleteTempAudio(localAudioPath);
      } catch (audioError) {
        logger.error(`[VOICE_GENERATION_FAILED] Error in TTS flow: ${audioError.message}. Falling back to text message.`, {
          service: 'webhookController',
          provider: 'whatsapp',
          conversationId: conversation._id,
          messageId
        });
      }
    }

    // 24. Send Text Message via Meta API (if text requested or voice fallback)
    if (!wantsVoice || !audioSent) {
      try {
        sentMsg = await waService.sendTextMessage(from, cleanReply);
        const metaMsgId = sentMsg?.messages?.[0]?.id || `wa_out_${Date.now()}`;
        logger.info('[META_SEND_SUCCESS] Text reply sent to Meta API', {
          metaMessageId: metaMsgId,
          recipient: from,
          status: 'sent'
        });
      } catch (metaErr) {
        sendFailed = true;
        lastSendError = metaErr;
        const sanitizedStatus = metaErr.response?.status || metaErr.statusCode || metaErr.status || 500;
        const sanitizedCode = metaErr.response?.data?.error?.code || metaErr.errorCode || metaErr.code || 'UNKNOWN_ERROR';
        const sanitizedMsg = metaErr.response?.data?.error?.message || metaErr.message;
        logger.error('[META_SEND_FAILED] Meta send API request failed', {
          status: sanitizedStatus,
          statusCode: sanitizedStatus,
          errorCode: sanitizedCode,
          errorMessage: sanitizedMsg,
          conversationId: conversation._id,
          workspaceId: waAccount.organization,
          userId: waAccount.user,
          messageId,
          service: 'whatsappService',
          provider: 'whatsapp',
          stage: 'outbound_whatsapp_send',
          recipient: from
        });
      }
    }

    // 25. PERSIST ASSISTANT REPLY ONLY IF META SEND SUCCEEDED
    if (!sendFailed && sentMsg) {
      const assistantMessage = await conversation.addMessage({
        role: 'assistant',
        content: aiResult.content,
        waMessageId: sentMsg?.messages?.[0]?.id,
        type: audioSent ? 'audio' : 'text',
        media: audioSent ? { audioUrl: sentMsg?.mediaUrl || null } : null,
        status: 'sent',
        processingStatus: 'completed',
        tokens: aiResult.tokensUsed || 0,
        responseTime: aiResult.responseTime || 0,
      });

      await updateMessageProcessingState(persistedCustomerMessage, {
        processingStatus: 'completed',
        aiReplyMessageId: assistantMessage?._id?.toString() || sentMsg?.messages?.[0]?.id,
        processingError: null
      });
      markMessageCompleted(messageId);

      if (targetAgent?._id) {
        conversation.agent = targetAgent._id;
      }
      conversation.totalMessages = (conversation.totalMessages || 0) + 2;
      conversation.totalTokensUsed = (conversation.totalTokensUsed || 0) + (aiResult.tokensUsed || 0);
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      logger.info('[ASSISTANT_REPLY_PERSISTED] Assistant reply saved to database and inbox', {
        conversationId: conversation._id,
        messageId: assistantMessage?._id,
        waMessageId: sentMsg?.messages?.[0]?.id
      });

      // Trigger Deal Automation asynchronously
      DealAutomationService.analyzeAndAutoUpdateDeal(conversation).catch(err => {
        logger.error(`Deal Automation error: ${err.message}`);
      });

      // Broadcast updated conversation with both user and assistant messages
      const updatedMessages = await conversation.getRecentMessages();
      emitToUser(waAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: updatedMessages,
        platform: 'whatsapp',
        customerPhone: conversation.customerPhone || from,
        customerName: conversation.customerName,
      }, waAccount.organization?.toString());

      emitNotification(waAccount.user.toString(), {
        type: 'new_message',
        title: 'New WhatsApp Message',
        message: `${customerName || from}: ${userMessageText.slice(0, 60)}${userMessageText.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'whatsapp',
      }, waAccount.organization?.toString());

      // Update usage counters & deduct credits safely
      await creditHelper.deductCredits(waAccount.user, creditCost).catch(err => {
        logger.warn(`Failed to deduct credits: ${err.message}`);
      });

      // Log transaction
      await creditHelper.logTransaction({
        userId: waAccount.user,
        type: 'deduction',
        amount: creditCost,
        description: `AI Agent: WhatsApp reply to ${customerName || from}`,
        metadata: { conversationId: conversation._id, platform: 'whatsapp' },
      }).catch(err => {
        logger.warn(`Failed to log credit transaction: ${err.message}`);
      });

      // Update agent stats
      if (targetAgent?._id) {
        await Agent.findByIdAndUpdate(targetAgent._id, {
          $inc: {
            'stats.totalMessages': 2,
            'stats.totalConversations': conversation.totalMessages === 2 ? 1 : 0,
          },
        }).catch(() => {});
      }

      logger.info(`[PIPELINE_COMPLETE] AI reply cycle completed for ${from} in ${aiResult.responseTime || 0}ms`);
    } else if (sendFailed) {
      await updateMessageProcessingState(persistedCustomerMessage, {
        processingStatus: 'failed',
        processingError: lastSendError?.message || 'META_SEND_FAILED'
      });
      logger.warn('[ASSISTANT_REPLY_SKIPPED] Assistant reply not persisted because Meta send failed. Customer message remains intact for manual reply.', {
        conversationId: conversation._id
      });
      if (options.throwOnError) {
        throw lastSendError || new Error('Meta send API request failed');
      }
    }
  } catch (err) {
    if (conversation?._id && waAccount?.user) {
      emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false }, waAccount.organization?.toString());
    }
    await updateMessageProcessingState(persistedCustomerMessage, {
      processingStatus: 'failed',
      processingError: err.message
    });
    logger.error(`[PIPELINE_ERROR] Error processing WhatsApp webhook task: ${err.message}`, {
      service: 'webhookController',
      provider: 'whatsapp',
      conversationId: conversation?._id,
      workspaceId: waAccount?.organization,
      userId: waAccount?.user,
      messageId,
      stage: 'webhook_pipeline',
      stack: err.stack
    });
    if (options.throwOnError) {
      throw err;
    }
  } finally {
    if (messageId) {
      inFlightMessageIds.delete(messageId);
    }
  }
}

// Process payload from BullMQ Worker or direct queue fallback
exports.processWebhookPayload = async (payload, options = {}) => {
  try {
    let events = [];
    if (typeof WhatsAppService.parseWebhookEvents === 'function') {
      events = WhatsAppService.parseWebhookEvents(payload) || [];
    }
    if (events.length === 0) {
      const singleParsed = WhatsAppService.parseWebhookMessage(payload);
      if (singleParsed) {
        events = [singleParsed];
      }
    }

    if (!events || events.length === 0) {
      logger.warn('[WEBHOOK_REJECTED] Unparsed or invalid Meta payload format', { reason: 'UNPARSED_PAYLOAD' });
      return;
    }

    let firstError = null;
    for (const event of events) {
      try {
        await processSingleWebhookEvent(event, options);
      } catch (eventErr) {
        if (!firstError) firstError = eventErr;
      }
    }

    if (firstError && options.throwOnError) {
      throw firstError;
    }
  } catch (err) {
    logger.error('[WEBHOOK_PAYLOAD_PARSE_ERROR] Webhook payload processing error:', {
      service: 'webhookController',
      provider: 'whatsapp',
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
};

