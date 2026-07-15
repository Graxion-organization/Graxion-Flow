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

// POST - Receive incoming messages (Push to BullMQ)
exports.receiveMessage = async (req, res) => {
  // Always respond 200 immediately to Meta
  res.status(200).json({ status: 'ok' });
  await enqueueWebhook('whatsapp', 'message', req.body);
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

    try {
      logger.info(`Incoming message from ${from} on phone ${phoneNumberId}`);

      // 0. Deduplicate webhook to prevent double processing (e.g. Meta retry after 20s timeout)
      const existingMessage = await Conversation.findOne({ 'messages.waMessageId': messageId });
      if (existingMessage) {
        logger.info(`[DEDUPLICATION] Message ${messageId} already processed, skipping.`);
        return;
      }

      // 1. Find WhatsApp account
      // const waAccount = await WhatsappAccount.findOne({
      //   phoneNumberId,
      //   status: 'connected',
      //   isActive: true,
      // });
      const waAccount = await WhatsappAccount.findOne({
        phoneNumberId,
        status: 'connected',
        isActive: true,
      }).select('+accessToken'); // 🔥 IMPORTANT

      if (!waAccount) {
        logger.warn(`No active WA account for phoneNumberId: ${phoneNumberId}`);
        return;
      }

      // 2. Find active agent for this account
      const agent = await Agent.findOne({
        whatsappAccount: waAccount._id,
        isActive: true,
      });
      if (!agent) {
        logger.warn(`No active agent for account: ${waAccount._id}`);
        return;
      }

      // 3. Find or create conversation
      let conversation = await Conversation.findOne({
        whatsappAccount: waAccount._id,
        customerPhone: from,
      }).sort({ createdAt: -1 });

      if (!conversation) {
        conversation = await Conversation.create({
          user: waAccount.user,
          organization: waAccount.organization, // ← CRITICAL: was missing
          agent: agent._id,
          whatsappAccount: waAccount._id,
          customerPhone: from,
          customerName,
          customerWaId: from,
          status: 'active',
          lastMessageAt: new Date(),
        });
        // Send greeting if configured
        if (agent.greetingMessage) {
          const waService = new WhatsAppService(decrypt(waAccount.accessToken), phoneNumberId);
          await waService.sendTextMessage(from, agent.greetingMessage);
        }
      } else if (conversation.status === 'closed') {
        // Reopen closed conversation
        conversation.status = 'active';
        await conversation.addMessage({
          role: 'system',
          content: 'System: Conversation session was reset/reopened.',
          timestamp: new Date(),
        });
      }

      const waService = new WhatsAppService(decrypt(waAccount.accessToken), phoneNumberId);

      // --- Handle Incoming Media and Types ---
      // Handle advanced media types
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
          await waService.sendTextMessage(
            from,
            "Sorry, I couldn't properly hear your audio message. Could you please send it as text?"
          );
          return;
        }
      } else if (type === 'image' && imageId) {
        logger.info(`Incoming image message from ${from}.`);
        userMessageText = '[Image received]';
        try {
          const mediaUrl = await waService.getMediaUrl(imageId);
          mediaData = { type: 'image', url: mediaUrl, id: imageId };
          // Optional: Upload to Cloudinary if we have setup for it, but for now just save the URL/ID
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
        userMessageText = buttonReply.title; // The text on the button
      }

      if (!userMessageText) return;

      // --- TRAI DND Opt-Out Check (IND-002) ---
      const optOutKeywords = ['stop', 'cancel', 'unsubscribe', 'dnd'];
      if (optOutKeywords.includes(userMessageText.trim().toLowerCase())) {
        logger.info(`Opt-out keyword received from ${from}`);
        // Find contact and opt them out
        const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
        if (contact) {
          contact.isOptedIn = false;
          await contact.save();
        }
        await waService.sendTextMessage(
          from,
          "You have been successfully opted out of our messages. You will no longer receive broadcasts. Reply 'START' to opt back in at any time."
        );
        return; // Stop further processing
      }

      // Opt-in logic (Optional but good UX)
      if (['start', 'resume', 'opt in'].includes(userMessageText.trim().toLowerCase())) {
        const contact = await Contact.findOne({ phone: from, organization: waAccount.organization });
        if (contact && !contact.isOptedIn) {
          contact.isOptedIn = true;
          await contact.save();
          await waService.sendTextMessage(from, 'You have successfully opted back in. Welcome back!');
          return;
        }
      }

      // If human handoff, just append message and do not trigger AI
      if (conversation.status === 'human_handoff') {
        await conversation.addMessage({
          role: 'user',
          content: userMessageText,
          waMessageId: messageId,
          type: type,
          media: mediaData,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });
        conversation.lastMessageAt = new Date();
        conversation.isRead = false;
        await conversation.save();

        emitNotification(waAccount.user.toString(), {
          type: 'new_message',
          title: '💬 New WhatsApp Message',
          message: `${customerName || from}: ${userMessageText.slice(0, 60)}${userMessageText.length > 60 ? '…' : ''}`,
          conversationId: conversation._id,
          platform: 'whatsapp',
        });
        return;
      }

      // 4. Check business hours
      const withinHours = AIService.isWithinBusinessHours(agent.businessHours);
      if (!withinHours && agent.outOfHoursMessage) {
        await waService.sendTextMessage(from, agent.outOfHoursMessage);
        return;
      }

      // 5. Check human handoff keywords
      if (AIService.shouldHandoffToHuman(userMessageText, agent.humanHandoffKeywords)) {
        conversation.status = 'human_handoff';
        await conversation.addMessage({
          role: 'user',
          content: userMessageText,
          waMessageId: messageId,
          type: type,
          media: mediaData,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });
        await conversation.addMessage({
          role: 'system',
          content: 'System: 🔴 HUMAN HANDOFF REQUESTED. Email notification sent to admin.',
          timestamp: new Date(),
        });
        conversation.lastMessageAt = new Date();
        conversation.isRead = false;
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

        // Send real email alert instead of just logging
        const { sendEmail } = require('../services/emailService');
        if (waAccount.user) {
          const userForEmail = await User.findById(waAccount.user).select('email');
          if (userForEmail && userForEmail.email) {
            await sendEmail({
              to: userForEmail.email,
              subject: `🔴 Human Handoff Requested for WhatsApp`,
              html: `<p>WhatsApp user <b>${customerName || from}</b> has requested human support.</p><p>Conversation ID: ${conversation._id}</p><p>Please log in to the dashboard to respond.</p>`,
            }).catch((err) => logger.error('Failed to send handoff email:', err));
          }
        }
        logger.info(`Human handoff triggered for WA conversation: ${conversation._id}`);

        await waService.sendTextMessage(from, agent.humanHandoffMessage);
        return;
      }

      // 6. Check user message limit & credits
      const user = await User.findById(waAccount.user).select('+usage +subscription');
      const Plan = require('../models/Plan');
      const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
      const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

      if ((user.subscription?.credits ?? 0) < creditCost) {
        logger.warn(`User ${user._id} hit credit limit for AI agent responses`);
        return;
      }

      // Check custom agent credit spend limit
      const agentLimit = user.subscription?.agentCreditLimit || 0;
      const agentUsed = user.usage?.agentCreditsUsedThisMonth || 0;
      if (agentLimit > 0 && agentUsed >= agentLimit) {
        logger.warn(`User ${user._id} hit custom Monthly Agent Credit Spend Limit (${agentUsed}/${agentLimit})`);
        return;
      }

      const limits = await user.getPlanLimits();
      if (user.usage.messagesThisMonth >= limits.messages) {
        logger.warn(`User ${user._id} hit message limit`);
        return;
      }

      // 7. Add user message to conversation
      await conversation.addMessage({
        role: 'user',
        content: userMessageText,
        waMessageId: messageId,
        type: type,
        media: mediaData,
        timestamp: new Date(parseInt(timestamp) * 1000),
      });

      // 8. Check Flow Engine (AI-003)
      const FlowEngine = require('../services/flowEngine');
      const handledByFlow = await FlowEngine.handleIncomingMessage(waAccount, from, userMessageText);
      if (handledByFlow) {
        logger.info(`[FlowEngine] Message from ${from} handled by flow engine. Bypassing AI.`);
        await waService.markAsRead(messageId);
        return;
      }

      // 8a. Get recent context window
      const contextMessages = await conversation
        .getRecentMessages(20)
        .filter((m) => m.role !== 'system')
        .slice(-(agent.contextWindow * 2))
        .map((m) => ({ role: m.role, content: m.content }));

      // 8b. Check if it's a voice request (or if they sent an audio note)
      const wantsVoice = isVoiceRequest(userMessageText) || isAudioRequest;

      // 8c. Check for Keyword Triggers (WA-011)
      const matchedTrigger = await checkKeywordMatch(waAccount.organization, userMessageText);
      if (matchedTrigger) {
        logger.info(`[KEYWORD TRIGGER] Matched trigger ${matchedTrigger._id} for ${from}`);

        if (matchedTrigger.action === 'SEND_MESSAGE') {
          const sentMsg = await waService.sendTextMessage(from, matchedTrigger.response);

          await conversation.addMessage({
            role: 'assistant',
            content: matchedTrigger.response,
            waMessageId: sentMsg?.messages?.[0]?.id,
            type: 'text',
            status: 'sent',
          });

          await waService.markAsRead(messageId);
          return; // Skip AI entirely
        }
        // START_FLOW and ASSIGN_AGENT to be implemented in their respective phases
      }

      // 9. Generate AI response (platform='whatsapp' for proper formatting instructions)
      const aiResult = await AIService.generate(
        agent,
        contextMessages.slice(0, -1),
        userMessageText,
        'whatsapp',
        wantsVoice
      );

      // 9a. Sanitize response - remove markdown symbols not supported by WhatsApp
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
      if (wantsVoice) {
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
        responseTime: aiResult.responseTime,
      });

      conversation.totalMessages += 2;
      conversation.totalTokensUsed += aiResult.tokensUsed;
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

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
      logger.error(`Error processing WhatsApp webhook task: ${err.message}`, { stack: err.stack });
    }
  } catch (err) {
    logger.error('Webhook payload parsing error:', err);
    throw err;
  }
};
