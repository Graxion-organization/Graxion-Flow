const WhatsAppService = require('../services/whatsappService');
const AIService = require('../services/aiService');
const WhatsappAccount = require('../models/WhatsappAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
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
    //  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    const result = await WhatsAppService.verifyWebhook(mode, token, challenge);
    logger.info('Webhook verified successfully');
    res.status(200).send(result);
  } catch (err) {
    logger.warn('Webhook verification failed');
    res.status(403).send('Forbidden');
  }
};

// In-memory fast deduplication cache (Zero-latency, non-blocking)
const recentMessageIds = new Map();
function isDuplicateMessage(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (recentMessageIds.size > 3000) {
    for (const [k, time] of recentMessageIds.entries()) {
      if (now - time > 1800000) recentMessageIds.delete(k);
    }
  }
  if (recentMessageIds.has(msgId)) return true;
  recentMessageIds.set(msgId, now);
  return false;
}

// POST - Receive incoming messages (Direct real-time async dispatch - zero queue deadlock)
exports.receiveMessage = async (req, res) => {
  // Always respond 200 immediately to Meta
  res.status(200).json({ status: 'ok' });

  // Direct async execution (0.1ms tick, zero network/queue overhead)
  setImmediate(async () => {
    try {
      await exports.processWebhookPayload(req.body);
    } catch (err) {
      logger.error(`[WhatsApp Webhook Error]: ${err.message}`, { stack: err.stack });
    }
  });

  // Also record in WebhookLog asynchronously
  try {
    const WebhookLog = require('../models/WebhookLog');
    WebhookLog.create({
      platform: 'whatsapp',
      eventType: 'message',
      payload: req.body,
      status: 'PROCESSING'
    }).catch(() => {});
  } catch (_) {}
};

// Process payload from BullMQ Worker
exports.processWebhookPayload = async (payload) => {
  try {
    const parsed = WhatsAppService.parseWebhookMessage(payload);
    if (!parsed) return;

    if (parsed.isStatusUpdate) {
      const { messageId, status } = parsed;
      const conv = await Conversation.findOneAndUpdate(
        { 'messages.waMessageId': messageId },
        { $set: { 'messages.$.status': status } },
        { new: true }
      );
      if (conv) {
        emitToUser(conv.user.toString(), 'conversation_updated', {
          conversationId: conv._id,
          messages: await conv.getRecentMessages(),
        });
        
        // Track Pricing if included (META API Phase 15)
        if (parsed.pricing && conv.organization) {
          await conversationPricingService.processPricingWebhook(conv.organization, parsed.pricing, parsed.timestamp);
        }
      }

      // Track Broadcast Message Status
      try {
        const BroadcastMessage = require('../models/BroadcastMessage');
        const Broadcast = require('../models/Broadcast');
        const bMsg = await BroadcastMessage.findOne({ messageId });
        
        if (bMsg && bMsg.status !== status) {
          // Meta's webhook can send 'delivered', 'read', 'failed'
          bMsg.status = status;
          if (parsed.reason) {
            bMsg.errorReason = parsed.reason;
            if (status === 'failed') {
              logger.error(`[Meta Webhook] Message ${messageId} FAILED. Reason: ${parsed.reason}`);
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

            // If the webhook is a failure, check if the entire broadcast should be marked as FAILED
            if (status === 'failed' && updatedBroadcast && updatedBroadcast.status === 'COMPLETED') {
              if (updatedBroadcast.sentCount > 0 && updatedBroadcast.failedCount >= updatedBroadcast.sentCount) {
                updatedBroadcast.status = 'FAILED';
                await updatedBroadcast.save();
              }
            }
          }
        }
      } catch (err) {
        logger.error(`Error updating broadcast message status for ${messageId}: ${err.message}`);
      }

      return;
    }

    if (parsed.isTemplateStatusUpdate) {
      logger.info(`[Meta Webhook] Template Status Update: ${parsed.templateName} -> ${parsed.status}`);
      // Find template by name and update status
      await Template.findOneAndUpdate(
        { name: parsed.templateName },
        { status: parsed.status, rejectReason: parsed.reason }
      );
      return;
    }

    if (parsed.isAccountUpdate) {
      logger.warn(`[Meta Webhook] Account Update for ${parsed.phoneNumberId}: ${parsed.event_update || parsed.decision}`);
      // Update account quality rating
      const waAccount = await WhatsappAccount.findOne({ phoneNumberId: parsed.phoneNumberId });
      if (waAccount) {
        waAccount.qualityRating = parsed.event_update?.quality_rating || waAccount.qualityRating;
        waAccount.accountStatus = parsed.event_update?.status || waAccount.accountStatus;
        await waAccount.save();
        
        // Notify admin of quality drop
        if (waAccount.qualityRating === 'YELLOW' || waAccount.qualityRating === 'RED') {
          emitNotification(waAccount.user.toString(), {
            type: 'system_alert',
            title: '⚠️ WhatsApp Quality Drop',
            message: `Your account quality rating dropped to ${waAccount.qualityRating}. Please review your messaging.`,
            platform: 'whatsapp'
          });
        }
      }
      return;
    }

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
    if (!allowedTypes.includes(parsed.type)) return;

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

    try {
      logger.info(`Incoming WhatsApp message from ${from} on phone ${phoneNumberId}`);

      // 0. Non-blocking in-memory and DB Deduplication (prevents duplicate processing on Meta retries)
      if (isDuplicateMessage(messageId)) {
        logger.info(`[DEDUPLICATION] Message ${messageId} is already processing (memory cache). Skipping.`);
        return;
      }

      const existingMessage = await Conversation.findOne({ 'messages.waMessageId': messageId });
      if (existingMessage) {
        logger.info(`[DEDUPLICATION] Message ${messageId} is already saved in DB. Skipping.`);
        return;
      }

      // 1. Find WhatsApp account (with fallback for pending/reconnecting status)
      waAccount = await WhatsappAccount.findOne({
        phoneNumberId,
        status: 'connected',
        isActive: true,
      }).select('+accessToken');

      if (!waAccount) {
        waAccount = await WhatsappAccount.findOne({ phoneNumberId }).select('+accessToken');
      }

      if (!waAccount) {
        // Fallback: match any active account if there's only 1 active account
        waAccount = await WhatsappAccount.findOne({ isActive: true }).select('+accessToken');
        if (waAccount) {
          logger.info(`[Fallback Account] Matched active account ${waAccount.phoneNumberId} for incoming webhook`);
        }
      }

      if (!waAccount) {
        logger.warn(`No active WA account found for phoneNumberId: ${phoneNumberId}`);
        return;
      }

      const waService = new WhatsAppService(decrypt(waAccount.accessToken), phoneNumberId);

      // --- Handle Incoming Media and Types ---
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

      // If it's an audio message, try downloading and transcribing it
      if (type === 'audio' && audioId) {
        logger.info(`Incoming audio message from ${from}. Downloading and transcribing...`);
        try {
          const mediaUrl = await waService.getMediaUrl(audioId);
          const tempAudioPath = path.join(os.tmpdir(), `incoming_${audioId}.ogg`);
          await waService.downloadMedia(mediaUrl, tempAudioPath);
          userMessageText = await transcribeAudio(tempAudioPath);
          await deleteTempAudio(tempAudioPath);
          logger.info(`Transcribed audio text from ${from}: ${userMessageText}`);
          isAudioRequest = true;
        } catch (sttError) {
          logger.error(`Failed to transcribe incoming audio: ${sttError.message}`);
          userMessageText = '[Voice note received]';
        }
      } else if (type === 'image' && imageId) {
        logger.info(`Incoming image message from ${from}.`);
        userMessageText = '[Image received]';
        try {
          const mediaUrl = await waService.getMediaUrl(imageId);
          mediaData = { type: 'image', url: mediaUrl, id: imageId };
        } catch (err) {
          logger.error('Failed to process image:', err.message);
        }
      } else if (type === 'document' && documentId) {
        logger.info(`Incoming document message from ${from}.`);
        userMessageText = '[Document received]';
        try {
          const mediaUrl = await waService.getMediaUrl(documentId);
          mediaData = { type: 'document', url: mediaUrl, id: documentId };
        } catch (err) {
          logger.error('Failed to process document:', err.message);
        }
      } else if (type === 'location' && location) {
        logger.info(`Incoming location message from ${from}.`);
        userMessageText = `[Location received: ${location.latitude}, ${location.longitude}]`;
        mediaData = { type: 'location', data: location };
      } else if (type === 'interactive' && buttonReply) {
        logger.info(`Incoming interactive button reply from ${from}.`);
        userMessageText = buttonReply.title;
      }

      if (!userMessageText && !mediaData) return;
      if (!userMessageText) userMessageText = `[${type} received]`;

      // 2. Find or create conversation
      conversation = await Conversation.findOne({
        organization: waAccount.organization,
        platform: 'whatsapp',
        customerPhone: from,
      }).sort({ createdAt: -1 });

      if (!conversation) {
        conversation = await Conversation.create({
          user: waAccount.user,
          organization: waAccount.organization,
          whatsappAccount: waAccount._id,
          customerPhone: from,
          customerName: customerName || from,
          customerWaId: from,
          status: 'active',
          lastMessageAt: new Date(),
        });
      } else {
        if (conversation.status === 'closed') {
          conversation.status = 'active';
        }
        if (conversation.whatsappAccount?.toString() !== waAccount._id.toString()) {
          conversation.whatsappAccount = waAccount._id;
        }
      }

      // 🔥 STEP 3: GUARANTEED INSTANT SAVE OF CUSTOMER MESSAGE TO INBOX!
      await conversation.addMessage({
        role: 'user',
        content: userMessageText,
        waMessageId: messageId,
        type: type || 'text',
        media: mediaData,
        timestamp: new Date(parseInt(timestamp) * 1000 || Date.now()),
      });
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      // 🔥 STEP 4: REAL-TIME ZERO-LATENCY INBOX BROADCAST:
      emitToUser(waAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
        customerPhone: conversation.customerPhone || from,
        customerName: conversation.customerName || customerName,
      });

      emitNotification(waAccount.user.toString(), {
        type: 'new_message',
        title: '🟢 New WhatsApp Message',
        message: `${conversation.customerName || from}: ${userMessageText.slice(0, 60)}${userMessageText.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'whatsapp',
      });

      // 5. TRAI DND Opt-Out Check (IND-002)
      const optOutKeywords = ['stop', 'cancel', 'unsubscribe', 'dnd'];
      if (optOutKeywords.includes(userMessageText.trim().toLowerCase())) {
        logger.info(`Opt-out keyword received from ${from}`);
        const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
        if (contact) {
          contact.isOptedIn = false;
          await contact.save();
        }
        await waService.sendTextMessage(
          from,
          "You have been successfully opted out of our messages. You will no longer receive broadcasts. Reply 'START' to opt back in at any time."
        );
        return;
      }

      // Opt-in logic
      if (['start', 'resume', 'opt in'].includes(userMessageText.trim().toLowerCase())) {
        const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
        if (contact && !contact.isOptedIn) {
          contact.isOptedIn = true;
          await contact.save();
          await waService.sendTextMessage(from, 'You have successfully opted back in. Welcome back!');
          return;
        }
      }

      // 6. Check human handoff
      if (conversation.status === 'human_handoff') {
        logger.info(`Conversation ${conversation._id} is in human handoff. Message preserved in inbox.`);
        return;
      }

      // 7. Check human handoff triggers across active agents
      const activeAgents = await Agent.find({ organization: waAccount.organization, isActive: true });
      const combinedHandoffKeywords = [...new Set(activeAgents.flatMap(a => a.humanHandoffKeywords || []))];

      if (AIService.shouldHandoffToHuman(userMessageText, combinedHandoffKeywords)) {
        conversation.status = 'human_handoff';
        await conversation.addMessage({
          role: 'system',
          content: 'System: 🔴 HUMAN HANDOFF REQUESTED. Email notification sent to admin.',
          timestamp: new Date(),
        });
        await conversation.save();

        emitToUser(waAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: await conversation.getRecentMessages(),
        });

        emitNotification(waAccount.user.toString(), {
          type: 'human_handoff',
          title: '🔴 Human Handoff Requested',
          message: `WhatsApp: ${customerName || from} needs human support.`,
          conversationId: conversation._id,
          platform: 'whatsapp',
        });

        await waService.sendTextMessage(from, 'Connecting you to a human agent...');
        return;
      }

      // 8. Find active agent for this account
      const agent = await Agent.findOne({ organization: waAccount.organization, isActive: true }) ||
                    await Agent.findOne({ whatsappAccounts: waAccount._id, isActive: true }) ||
                    await Agent.findOne({ whatsappAccount: waAccount._id, isActive: true }) ||
                    await Agent.findOne({ isActive: true });

      if (!agent) {
        logger.info(`No active agent found for organization: ${waAccount.organization}. Message saved in inbox for manual reply.`);
        return;
      }

      // Send initial greeting if new conversation
      if (conversation.messages.length <= 1 && agent.greetingMessage) {
        await waService.sendTextMessage(from, agent.greetingMessage).catch(() => {});
      }

      // 9. Check User Message limit & Credits
      let creditCost = 1;
      const user = await User.findById(waAccount.user).select('+usage +subscription');
      if (user) {
        const Plan = require('../models/Plan');
        const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
        creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

        if ((user.subscription?.credits ?? 0) < creditCost) {
          logger.warn(`User ${user._id} out of credits for AI response. Message saved in inbox for manual reply.`);
          emitNotification(waAccount.user.toString(), {
            type: 'system_alert',
            title: '⚠️ AI Credits Exhausted',
            message: 'WhatsApp AI response paused: insufficient credits. Please recharge.',
            conversationId: conversation._id,
            platform: 'whatsapp'
          });
          return;
        }

        const limits = await user.getPlanLimits();
        if (user.usage?.messagesThisMonth >= limits.messages) {
          logger.warn(`User ${user._id} hit monthly message limit. Message saved in inbox.`);
          return;
        }
      }

      // 8. Check Flow Engine (AI-003)
      const FlowEngine = require('../services/flowEngine');
      const handledByFlow = await FlowEngine.handleIncomingMessage(waAccount, from, userMessageText);
      if (handledByFlow) {
        logger.info(`[FlowEngine] Message from ${from} handled by flow engine. Bypassing AI.`);
        await waService.markAsRead(messageId);
        return;
      }

      // 8a. Get recent context window
      const contextMessages = (await conversation.getRecentMessages(20))
        .filter((m) => m.role !== 'system')
        .slice(-((agent.contextWindow || 10) * 2))
        .map((m) => ({ role: m.role, content: m.content }));
 
      // 8b. Check if it's a voice request (or if they sent an audio note)
      const wantsVoice = isVoiceRequest(userMessageText) || isAudioRequest;
 
      // 8c. Check for Keyword Triggers (WA-011)
      const matchedTrigger = await checkKeywordMatch(waAccount.organization, userMessageText, 'whatsapp', 'DM', agent?._id);
      if (matchedTrigger) {
        await waService.markAsRead(messageId);
        logger.info(`[KEYWORD TRIGGER] Matched trigger ${matchedTrigger._id} for ${from}`);
 
        if (matchedTrigger.action === 'SEND_MESSAGE') {
          let sentMsg;
          if (matchedTrigger.mediaType === 'image' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendImageMessage(from, matchedTrigger.mediaUrl, matchedTrigger.response);
          } else if (matchedTrigger.mediaType === 'video' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendVideoMessage(from, matchedTrigger.mediaUrl, matchedTrigger.response);
          } else if (matchedTrigger.mediaType === 'audio' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendAudioMessage(from, matchedTrigger.mediaUrl);
            // WhatsApp Audio messages might not support captions directly in all API versions, so we could send text too, but let's stick to standard audio message
            if (matchedTrigger.response) {
              await waService.sendTextMessage(from, matchedTrigger.response);
            }
          } else if (matchedTrigger.mediaType === 'document' && matchedTrigger.mediaUrl) {
            sentMsg = await waService.sendDocumentMessage(from, matchedTrigger.mediaUrl, 'document', matchedTrigger.response);
          } else {
            sentMsg = await waService.sendTextMessage(from, matchedTrigger.response);
          }
 
          await conversation.addMessage({
            role: 'assistant',
            content: matchedTrigger.response || '[Media Sent]',
            waMessageId: sentMsg?.messages?.[0]?.id,
            type: matchedTrigger.mediaType !== 'none' ? matchedTrigger.mediaType : 'text',
            media: matchedTrigger.mediaUrl ? { url: matchedTrigger.mediaUrl } : null,
            status: 'sent',
          });
 
          await waService.markAsRead(messageId);
          return; // Skip AI entirely
        }
        // START_FLOW and ASSIGN_AGENT to be implemented in their respective phases
      }
 
      // 9. Generate AI response using OrchestrationEngine
      const OrchestrationEngine = require('../services/orchestrationEngine');
      await waService.markAsRead(messageId);
      emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: true });
      const aiResult = await OrchestrationEngine.execute({
        organizationId: waAccount.organization,
        conversation,
        userMessageText,
        contextMessages: contextMessages.slice(0, -1),
        from,
        wantsVoice
      });
      emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });

      if (!aiResult || !aiResult.content) {
        logger.warn(`AI returned null content for WhatsApp message from ${from}, aborting silent fail.`);
        return;
      }
 
      const targetAgent = aiResult.agent || agent;
 
      // 9b. Check business hours of the target routed agent
      if (targetAgent) {
        const withinHours = AIService.isWithinBusinessHours(targetAgent.businessHours);
        if (!withinHours && targetAgent.outOfHoursMessage) {
          await waService.sendTextMessage(from, targetAgent.outOfHoursMessage);
          return;
        }
      }
 
      // 9c. Sanitize response - remove markdown symbols not supported by WhatsApp
      let cleanReply = AIService.sanitizeForWhatsApp(aiResult.content) || 'Sorry, something went wrong.';
      let detectedLanguage = 'hi-IN'; // default
 
      // Extract [LANG: xx-XX] tag if present
      const langMatch = cleanReply.match(/\[LANG:\s*([a-zA-Z-]+)\]/i);
      if (langMatch) {
        detectedLanguage = langMatch[1];
        cleanReply = cleanReply.replace(langMatch[0], '').trim();
        aiResult.content = aiResult.content.replace(langMatch[0], '').trim();
      }
 
      // 10. Mark incoming as read
      await waService.markAsRead(messageId);
 
      let sentMsg;
      let audioSent = false;
 
      // 11. Send Voice Message if requested
      if (wantsVoice && targetAgent.elevenLabsVoiceId) {
        try {
          logger.info(`Voice intent detected for ${from}. Generating audio with language ${detectedLanguage}...`);
 
          // Generate local MP3
          const localAudioPath = await generateSpeech(cleanReply, detectedLanguage);
 
          // Upload to Cloudinary
          const uploadResult = await CloudinaryService.upload(localAudioPath, {
            resource_type: 'video', // Audio is uploaded as video in Cloudinary
            folder: 'whatsapp_tts',
          });
 
          // Send audio message via WhatsApp
          sentMsg = await waService.sendAudioMessage(from, uploadResult.url);
          logger.info(`Audio message sent to ${from}`);
          audioSent = true;
 
          // Cleanup local file
          await deleteTempAudio(localAudioPath);
        } catch (audioError) {
          logger.error(`Error in TTS flow for ${from}: ${audioError.message}`);
          // Fallback: Text response will be sent below since audioSent is false
        }
      }
 
      // 11b. Send Text if voice was not requested, or if voice generation failed
      if (!wantsVoice || !audioSent) {
        sentMsg = await waService.sendTextMessage(from, cleanReply);
      }
 
      // 12. Save assistant message
      await conversation.addMessage({
        role: 'assistant',
        content: aiResult.content,
        waMessageId: sentMsg?.messages?.[0]?.id,
        type: type,
        media: mediaData,
        status: 'sent',
        tokens: aiResult.tokensUsed,
        responseTime: 0,
      });
 
      // Bind conversation sticky agent to target agent dynamically
      conversation.agent = targetAgent._id;
      conversation.totalMessages += 2;
      conversation.totalTokensUsed += aiResult.tokensUsed;
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      // Trigger Deal Automation asynchronously
      DealAutomationService.analyzeAndAutoUpdateDeal(conversation).catch(err => {
        logger.error(`Deal Automation error: ${err.message}`);
      });

      emitToUser(waAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
      });

      emitNotification(waAccount.user.toString(), {
        type: 'new_message',
        title: '💬 New WhatsApp Message',
        message: `${customerName || from}: ${userMessageText.slice(0, 60)}${userMessageText.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'whatsapp',
      });

      // 13. Update usage counters & deduct credits safely
      await creditHelper.deductCredits(waAccount.user, creditCost);

      // Log transaction
      await creditHelper.logTransaction({
        userId: waAccount.user,
        type: 'deduction',
        amount: creditCost,
        description: `AI Agent: WhatsApp reply to ${customerName || from}`,
        metadata: { conversationId: conversation._id, platform: 'whatsapp' },
      });

      // 14. Update agent stats
      await Agent.findByIdAndUpdate(agent._id, {
        $inc: {
          'stats.totalMessages': 2,
          'stats.totalConversations': conversation.totalMessages === 2 ? 1 : 0,
        },
      });

      logger.info(`AI reply sent to ${from} in ${aiResult.responseTime}ms`);
    } catch (err) {
      if (conversation?._id && waAccount?.user) {
        emitToUser(waAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });
      }
      logger.error(`Error processing WhatsApp webhook task: ${err.message}`, { stack: err.stack });
    }
  } catch (err) {
    logger.error('Webhook payload parsing error:', err);
    throw err;
  }
};
