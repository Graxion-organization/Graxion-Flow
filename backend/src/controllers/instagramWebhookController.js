const InstagramService = require('../services/instagramService');
const AIService = require('../services/aiService');
const InstagramAccount = require('../models/InstagramAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const rateLimitService = require('../services/rateLimitService');
const creditHelper = require('../utils/creditHelper');
const webhookQueue = require('../utils/webhookQueue');
const SystemSetting = require('../models/SystemSetting');
const { generateSpeech, deleteTempAudio, transcribeAudio, convertAudioToVideo } = require('../utils/audioHelper');
const CloudinaryService = require('../services/cloudinaryService');
const os = require('os');
const path = require('path');
const { checkKeywordMatch } = require('../utils/keywordMatcher');

const aiDebounceTimeouts = new Map();

const isVoiceRequest = (message) => {
  if (!message) return false;
  const keywords = ["voice", "audio", "recording", "awaz", "aawaz", "bol", "bolke", "bol ke", "sunao", "voice note", "audio me", "voice me", "speak", "speech"];
  const lowerMsg = message.toLowerCase();
  return keywords.some(kw => lowerMsg.includes(kw));
};


exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'] || req.query['hub_mode'];
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      logger.info('Instagram Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }
  res.status(400).send('Bad request');
};

exports.receiveMessage = async (req, res) => {
  logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] >>> ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  // 1. Immediate Heartbeat Log to verify connectivity
  logger.info(`>>> INSTAGRAM WEBHOOK ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  
  res.status(200).send('EVENT_RECEIVED'); // Always respond 200 immediately

  try {
    const { body } = req;
    logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Received payload: ${JSON.stringify(body)}`);
    logger.info(`[INSTAGRAM WEBHOOK RECEIVED]: ${JSON.stringify(body, null, 2)}`);
    logger.info('[FLOW] Webhook aaya: Instagram webhook payload received');

    if (body.object !== 'instagram') {
      logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Object is not 'instagram'. Skipping.`);
      return;
    }

    for (const entry of body.entry) {
      const igAccountId = entry.id; // Instagram account ID that received the message
      const changes = entry.changes; // For comments
      const messaging = entry.messaging; // For DMs

      if (igAccountId === '0') {
        logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Received Meta test webhook event (ID: 0). Skipping.`);
        logger.info('Received Meta test webhook event (ID: 0). Skipping processing.');
        continue;
      }

      logger.info(`Processing Instagram webhook entry for ID: ${igAccountId}`);
      logger.info(`Webhook entry payload: ${JSON.stringify(entry)}`);

      // 1. Find Instagram account
      const igAccount = await InstagramAccount.findOne({
        igAccountId,
        status: 'connected',
        isActive: true,
      }).select('+pageAccessToken +pageId');

      if (!igAccount) {
        logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Account not found in DB or disconnected for ID: ${igAccountId}. Skipping.`);
        logger.warn(`Instagram account not found in DB or disconnected for ID: ${igAccountId}`);
        continue;
      }
      logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Found IG Account: ${igAccount.igUsername || igAccountId}`);

      // Verify organization is active (leakage prevention)
      const Organization = require('../models/Organization');
      const org = await Organization.findOne({ _id: igAccount.organization, isActive: true });
      if (!org) {
        logger.info(`[RENDER_LOG] [INSTAGRAM_WEBHOOK] Organization ${igAccount.organization} is suspended/inactive. Skipping.`);
        logger.warn(`Organization ${igAccount.organization} is suspended/inactive. Blocking Instagram automation.`);
        continue;
      }

      // 2. Find active agent (optional, falls back to account-level settings)
      const agent = await Agent.findOne({
        instagramAccount: igAccount._id,
        isActive: true,
      });

      if (!agent) {
        logger.info(`No active agent found for Instagram account ID: ${igAccountId}. Will use account-level bot settings if enabled.`);
      }

      // 3. Process DMs
      if (messaging) {
        for (const event of messaging) {
          if (event.message && !event.message.is_echo) {
            await handleInstagramDM(event, igAccount, agent);
          } else if (event.message_edit) {
            await handleInstagramMessageEdit(event, igAccount, agent);
          } else {
            logger.info(`Skipping unsupported Instagram messaging event: ${JSON.stringify(event)}`);
          }
        }
      }

      // 4. Process Comments
      if (changes) {
        for (const change of changes) {
          if (change.field === 'comments' && change.value) {
            logger.info(`Received Instagram comment from ${change.value.from?.username || change.value.from?.id}`);
            await handleInstagramComment(change.value, igAccount, agent);
          } else if (change.field === 'messages' && change.value) {
            const dmEvent = normalizeInstagramChangeMessage(change.value);
            if (dmEvent && !dmEvent.message.is_echo) {
              await handleInstagramDM(dmEvent, igAccount, agent);
            } else if (dmEvent && dmEvent.message.is_echo) {
              logger.info(`[INSTAGRAM_WEBHOOK] Skipping echo message from changes.messages: ${JSON.stringify(change.value)}`);
            } else {
              logger.info(`Skipping unsupported Instagram changes.messages payload: ${JSON.stringify(change.value)}`);
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Instagram Webhook processing error: ${err.message || (err.errors ? JSON.stringify(err.errors) : err)}`);
  }
};

async function handleInstagramDM(event, igAccount, agent) {
  const senderId = event?.sender?.id;
  const messageId = event?.message?.mid;
  const replyToMessageId = event?.message?.reply_to?.mid || null;
  let text = event?.message?.text;
  const attachments = event?.message?.attachments;

  let audioUrl = null;
  if (attachments && attachments.length > 0) {
    const audioAttachment = attachments.find(a => a.type === 'audio' || a.type === 'voice');
    if (audioAttachment) {
      audioUrl = audioAttachment.payload?.url;
    }
  }

  logger.info(`Received Instagram DM from ${senderId}`);

  if (!senderId || !messageId || (!text && !audioUrl)) {
    logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Skipping DM event due to missing senderId, messageId, or text/audio`);
    logger.info(`Skipping DM event due to missing fields`);
    return;
  }

  // Ignore messages sent by the page/account itself
  if (senderId === igAccount.igAccountId) {
    logger.info(`Ignored self-DM by the connected account.`);
    return;
  }

  // Find or create conversation
  webhookQueue.enqueue(`instagram_${senderId}`, async () => {
    try {
      logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Webhook enqueued for senderId: ${senderId}, messageId: ${messageId}`);
      let conversation = await Conversation.findOne({
        organization: igAccount.organization,
        platform: 'instagram',
        customerIgId: senderId,
      }).sort({ createdAt: -1 });

      if (!conversation) {
        const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
        const profile = await igService.getCustomerProfile(senderId);
        const customerName = profile?.name || profile?.username || '';
        const agentId = agent ? agent._id : null;
        
        conversation = await Conversation.create({
          user: igAccount.user,
          organization: igAccount.organization,
          agent: agentId,
          instagramAccount: igAccount._id,
          platform: 'instagram',
          customerIgId: senderId,
          customerName: customerName,
          customerUsername: profile?.username || '',
          status: 'active',
          lastMessageAt: new Date(),
        });
      } else {
        if (conversation.status === 'closed') {
          conversation.status = 'active';
          await conversation.addMessage({
            role: 'system',
            content: 'System: Conversation session was reset/reopened.',
            timestamp: new Date(),
          });
        }
        if (conversation.instagramAccount?.toString() !== igAccount._id.toString()) {
          conversation.instagramAccount = igAccount._id;
          await conversation.save();
        }
      }

      // Record Webhook Usage
      await rateLimitService.recordWebhook(igAccount.user, 'instagram');

      // Deduplicate using Redis atomic lock to prevent double replies on Meta retries
      let isDuplicate = false;
      try {
        const redis = require('../config/redis').redis;
        const dedupKey = `ig_dm_dedup:${messageId}`;
        const isNew = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
        if (!isNew) isDuplicate = true;
      } catch (redisErr) {
        logger.warn(`Redis deduplication failed, falling back to MongoDB: ${redisErr.message}`);
        const recentMsgs = await conversation.getRecentMessages();
        isDuplicate = recentMsgs?.some(m => m.waMessageId === messageId);
      }
      
      if (isDuplicate) {
        logger.info(`[RENDER_LOG] [INSTAGRAM_DM] DUPLICATE DETECTED: Message ${messageId} already processed. Skipping.`);
        logger.info(`Message ${messageId} from Instagram user ${senderId} already processing/processed. Skipping duplicate webhook.`);
        return;
      }

      const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
      
      let userMessageText = text;
      let isAudioRequest = false;

      if (audioUrl) {
        logger.info(`Incoming Instagram audio message from ${senderId}. Downloading and transcribing...`);
        try {
          const tempAudioPath = path.join(os.tmpdir(), `incoming_ig_${messageId}.ogg`);
          await igService.downloadMedia(audioUrl, tempAudioPath);
          userMessageText = await transcribeAudio(tempAudioPath);
          await deleteTempAudio(tempAudioPath);
          logger.info(`Transcribed Instagram audio from ${senderId}: ${userMessageText}`);
          isAudioRequest = true;
          text = userMessageText; 
        } catch (sttError) {
          logger.error(`Failed to transcribe incoming Instagram audio: ${sttError.message}`);
          await igService.sendTextMessage(igAccount.igAccountId, senderId, "Sorry, I couldn't properly hear your audio message. Could you please send it as text?");
          return;
        }
      }

      // If human handoff, just append message and do not trigger AI
      if (conversation.status === 'human_handoff') {
        await conversation.addMessage({
          role: 'user',
          content: isAudioRequest ? userMessageText : (text || '[Audio Message]'),
          waMessageId: messageId,
          replyToMessageId: replyToMessageId,
          type: isAudioRequest ? 'audio' : 'text',
          media: isAudioRequest ? { url: audioUrl } : undefined,
          timestamp: new Date(),
        });
        conversation.lastMessageAt = new Date();
        conversation.isRead = false;
        await conversation.save();

        emitToUser(igAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: await conversation.getRecentMessages(),
        });

        emitNotification(igAccount.user.toString(), {
          type: 'new_message',
          title: '📸 New Instagram DM',
          message: `${conversation.customerName || senderId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
          conversationId: conversation._id,
          platform: 'instagram',
        });
        
        return;
      }

      // Check Handoff Keywords
      if (agent && AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
        conversation.status = 'human_handoff';
        await conversation.addMessage({
          role: 'user',
          content: text || '[Audio Message]',
          waMessageId: messageId,
          replyToMessageId: replyToMessageId,
          type: 'text',
          timestamp: new Date(),
        });
        await conversation.addMessage({
          role: 'system',
          content: 'System: 🔴 HUMAN HANDOFF REQUESTED. Email notification sent to admin.',
          timestamp: new Date(),
        });
        conversation.lastMessageAt = new Date();
        conversation.isRead = false;
        await conversation.save();
        
        emitToUser(igAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: await conversation.getRecentMessages(),
        });

        emitNotification(igAccount.user.toString(), {
          type: 'human_handoff',
          title: '🔴 Human Handoff Requested',
          message: `Instagram: ${conversation.customerName || senderId} needs human support.`,
          conversationId: conversation._id,
          platform: 'instagram',
        });

        logger.info(`[EMAIL ALERT] Human handoff triggered for Instagram conversation: ${conversation._id}`);

        const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
        await igService.sendTextMessage(igAccount.igAccountId, senderId, agent.humanHandoffMessage);
        return;
      }

      // Detect Bot Loop (Rate Limiter: max 10 messages per minute per conversation)
      try {
        const redis = require('../config/redis').redis;
        const loopKey = `bot_loop_ig:${conversation._id}`;
        const msgCount = await redis.incr(loopKey);
        if (msgCount === 1) await redis.expire(loopKey, 60);
        
        if (msgCount > 10) {
          logger.warn(`[BOT LOOP DETECTED] Instagram Conversation ${conversation._id} exceeded 10 msgs/min. Pausing AI.`);
          if (conversation.status !== 'human_handoff') {
            conversation.status = 'human_handoff';
            await conversation.addMessage({
              role: 'system',
              content: 'System: 🔴 AUTOMATIC BOT LOOP DETECTED. Rate limit exceeded (>10 messages per minute). AI Agent has been paused for safety. Admin must manually re-enable AI for this chat.',
              timestamp: new Date(),
            });
            await conversation.save();
            emitToUser(igAccount.user.toString(), 'conversation_updated', {
              conversationId: conversation._id,
              messages: await conversation.getRecentMessages(),
            });
          }
          return;
        }
      } catch (loopErr) {
        logger.error(`Error in bot loop detection (IG): ${loopErr.message}`);
      }

      // Check limits & credits
      const user = await User.findById(igAccount.user).select('+usage +subscription');
      const Plan = require('../models/Plan');
      const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
      const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

      if ((user.subscription?.credits ?? 0) < creditCost) {
        logger.info(`[RENDER_LOG] [INSTAGRAM_DM] User ${user._id} hit credit limit (${user.subscription?.credits} credits). Skipping AI.`);
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
      if (user.usage.messagesThisMonth >= limits.messages) return;

      await conversation.addMessage({
        role: 'user',
        content: text || '[Audio Message]',
        waMessageId: messageId,
        replyToMessageId: replyToMessageId,
        type: 'text',
        timestamp: new Date(),
      });
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      // IMMEDIATE UI UPDATE: Emit event and notification before AI starts processing
      emitToUser(igAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
        customerPhone: conversation.customerPhone || senderId
      });

      emitNotification(igAccount.user.toString(), {
        type: 'new_message',
        title: '📸 New Instagram DM',
        message: `${conversation.customerName || senderId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'instagram',
      });

      // --- AI Debouncing Logic ---
      const convIdStr = conversation._id.toString();
      if (aiDebounceTimeouts.has(convIdStr)) {
        clearTimeout(aiDebounceTimeouts.get(convIdStr));
      }

      const timeoutId = setTimeout(async () => {
        aiDebounceTimeouts.delete(convIdStr);
        try {
          // Re-fetch conversation to get all batched messages
          const conversation = await Conversation.findById(convIdStr);
          if (!conversation) return;
          
          const contextWindow = agent ? agent.contextWindow : 10;
          const contextMessages = (await conversation.getRecentMessages(20))
            .filter((m) => m.role !== 'system')
            .slice(-(contextWindow * 2))
            .map((m) => ({ role: m.role, content: m.content }));
            
          // Use the last message text as the current user text
          const text = contextMessages.length > 0 ? contextMessages[contextMessages.length - 1].content : '';

      // Check if bot is actually enabled
      let enabled = igAccount.messengerBotEnabled;
      if (!enabled) {
        logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Bot is disabled in settings for account: ${igAccount.igUsername}. Skipping AI.`);
        logger.info(`[IG DM SKIP]: Messenger bot is disabled for account: ${igAccount.igUsername}`);
        return;
      }

      // --- Rate Limit Check ---
      const isAllowed = await rateLimitService.checkAndRecordApiCall(igAccount.user, 'instagram');
      if (!isAllowed) {
        logger.warn(`Rate limit exceeded for user ${igAccount.user} on instagram`);
        await conversation.addMessage({
          role: 'system',
          content: 'System: 🔴 Message limit exceeded. Automated responses paused.',
          timestamp: new Date(),
        });
        return;
      }

      const wantsVoice = isVoiceRequest(text) || isAudioRequest;

      // Typing indicator
      await igService.sendAction(igAccount.igAccountId, senderId, 'typing_on');

      // Check for Keyword Triggers
      const matchedTrigger = await checkKeywordMatch(igAccount.organization, text, 'instagram', 'DM', agent?._id);
      if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
        logger.info(`[KEYWORD TRIGGER] Matched trigger ${matchedTrigger._id} for Instagram DM from ${senderId}`);
        let sentMsg;
        const shouldQuote = Math.random() > 0.5;
        const targetMessageId = shouldQuote ? messageId : null;
        if (matchedTrigger.mediaType === 'image' && matchedTrigger.mediaUrl) {
          sentMsg = await igService.sendImageMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
        } else if (matchedTrigger.mediaType === 'video' && matchedTrigger.mediaUrl) {
          sentMsg = await igService.sendVideoMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
        } else if (matchedTrigger.mediaType === 'audio' && matchedTrigger.mediaUrl) {
          sentMsg = await igService.sendAudioMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
        } else {
          sentMsg = await igService.sendTextMessage(igAccount.igAccountId, senderId, matchedTrigger.response, targetMessageId);
        }
        logger.info('[FLOW] Message res send hua: Keyword trigger response sent successfully');

        // If caption provided with media on instagram, we must send a separate text message since the API does not support captions in attachment directly
        if (matchedTrigger.mediaType !== 'none' && matchedTrigger.response) {
            await igService.sendTextMessage(igAccount.igAccountId, senderId, matchedTrigger.response, targetMessageId);
        }

        await conversation.addMessage({
          role: 'assistant',
          content: matchedTrigger.response || '[Media Sent]',
          waMessageId: sentMsg?.message_id || sentMsg?.id || messageId,
          replyToMessageId: targetMessageId,
          type: matchedTrigger.mediaType !== 'none' ? matchedTrigger.mediaType : 'text',
          media: matchedTrigger.mediaUrl ? { url: matchedTrigger.mediaUrl } : null,
          status: 'sent',
          tokens: 0,
          responseTime: 0,
        });

        conversation.totalMessages += 2;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        await igService.sendAction(igAccount.igAccountId, senderId, 'typing_off');
        return; // Skip AI
      }

      emitToUser(igAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: true });
      
      const tempAgent = agent || {
          _id: `ig_dm_${igAccount._id}`,
          systemPrompt: igAccount.messengerBotPrompt || "You are a helpful assistant. Reply to this Instagram message in a friendly way. Keep it short.",
          temperature: 0.7,
          contextWindow: 10,
          aiProvider: 'openai',
          model: 'gpt-4o-mini'
      };

      logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Passing to AI with text: "${text}"`);
      logger.info('[FLOW] AI ko gya: Request sent to AI for processing');
      const aiResult = await AIService.generate(tempAgent, contextMessages.slice(0, -1), text, 'instagram');
      logger.info(`[RENDER_LOG] [INSTAGRAM_DM] AI generated reply: "${aiResult.content}"`);
      emitToUser(igAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });
      
      if (!aiResult || !aiResult.content) {
        logger.warn(`AI returned null content for Instagram DM from ${senderId}, aborting silent fail.`);
        return;
      }

      const cleanReply = AIService.sanitizeForPlatform(aiResult.content, 'instagram');

      // Safety net: Never send canned error messages to real users
      if (cleanReply.includes('experiencing some technical difficulties') || cleanReply.includes('currently unable to process')) {
        logger.warn(`[INSTAGRAM_DM] Blocked canned error message from being sent to ${senderId}. Aborting.`);
        return;
      }

      let sentMsg;
      let audioSent = false;
      
      const audioSetting = await SystemSetting.findOne({ key: 'instagram_audio_enabled' });
      const instagramAudioEnabled = audioSetting ? audioSetting.value : true;

      if (wantsVoice && instagramAudioEnabled) {
        try {
          logger.info(`Voice intent detected for Instagram DM from ${senderId}. Generating audio...`);
          
          // Generate local MP3 (use cleanReply for TTS so it doesn't read out markdown characters)
          const localAudioPath = await generateSpeech(cleanReply, agent.language || 'en-US');
          
          // Convert local MP3 to MP4 video using ffmpeg
          const tempVideoPath = localAudioPath.replace('.mp3', '.mp4');
          await convertAudioToVideo(localAudioPath, tempVideoPath);

          // Upload Video to Cloudinary
          const uploadResult = await CloudinaryService.upload(tempVideoPath, {
            resource_type: 'video', 
            folder: 'instagram_tts'
          });

          // Send video message via Instagram
          sentMsg = await igService.sendVideoMessage(igAccount.igAccountId, senderId, uploadResult.url);
          logger.info(`Audio video message sent to Instagram user ${senderId}`);
          logger.info('[FLOW] Message res send hua: Video/Audio response sent successfully');
          audioSent = true;

          // Cleanup local files
          await deleteTempAudio(localAudioPath);
          await deleteTempAudio(tempVideoPath);
        } catch (audioError) {
          logger.error(`Error in Instagram TTS flow for ${senderId}: ${audioError.message}`);
          logger.info('[FLOW] Fallback hua: Audio generation failed, falling back to text');
          // Fallback to text
        }
      }

      if (!wantsVoice || !audioSent || !instagramAudioEnabled) {
        if (wantsVoice && (!audioSent || !instagramAudioEnabled)) {
            logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Voice generation failed or disabled. Falling back to text message.`);
        }
        const shouldQuote = Math.random() > 0.5;
        sentMsg = await igService.sendTextMessage(igAccount.igAccountId, senderId, cleanReply || "I am currently unable to process that request.", shouldQuote ? messageId : null);
        logger.info(`[RENDER_LOG] [INSTAGRAM_DM] Successfully sent text message reply to Instagram user.`);
        logger.info('[FLOW] Message res send hua: Text response sent successfully');
      }

      await conversation.addMessage({
        role: 'assistant',
        content: cleanReply,
        waMessageId: sentMsg?.message_id || sentMsg?.id || messageId,
        replyToMessageId: shouldQuote ? messageId : null,
        type: 'text',
        status: 'sent',
        tokens: aiResult.tokensUsed,
        responseTime: aiResult.responseTime,
      });

      conversation.totalMessages += 2;
      conversation.totalTokensUsed += aiResult.tokensUsed;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      emitToUser(igAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
      });

      emitNotification(igAccount.user.toString(), {
        type: 'new_message',
        title: '📸 New Instagram DM',
        message: `${conversation.customerName || senderId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'instagram',
      });

      // Safely deduct credits and increment usage counters
      await creditHelper.deductCredits(igAccount.user, creditCost);

      // Log transaction
      await creditHelper.logTransaction({
        userId: igAccount.user,
        type: 'deduction',
        amount: creditCost,
        description: `AI Agent: Instagram DM reply to ${conversation.customerName || senderId}`,
        metadata: { conversationId: conversation._id, platform: 'instagram' },
      });
      await Agent.findByIdAndUpdate(agent._id, {
        $inc: { 'stats.totalMessages': 2, 'stats.totalConversations': conversation.totalMessages === 2 ? 1 : 0 },
      });
      logger.info('[FLOW] Complete hua: Webhook processing completed successfully');
        } catch (debounceErr) {
          logger.error(`Error in debounced AI processing: ${debounceErr.message}`);
        }
      }, 4000); // 4 seconds debounce
      
      aiDebounceTimeouts.set(convIdStr, timeoutId);

    } catch (err) {
      logger.error(`[RENDER_LOG] [INSTAGRAM_DM] Error processing DM: ${err.message}`, err.stack);
      logger.info('[FLOW] Fallback hua: Error occurred during webhook processing');
      if (conversation?._id && igAccount?.user) {
        emitToUser(igAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });
      }
      logger.error(`Error processing Instagram DM task: ${err.message}`, { stack: err.stack });
    }
  }, { platform: 'instagram', payload: { senderId, messageId, text } });

}

function normalizeInstagramChangeMessage(value) {
  const senderId = value?.from?.id || value?.sender?.id;
  const messageId = value?.message?.mid || value?.mid;
  const text = value?.message?.text || value?.text;
  const isEcho = value?.message?.is_echo || false;

  if (!senderId || !messageId || !text) return null;

  return {
    sender: { id: senderId },
    message: {
      mid: messageId,
      text,
      is_echo: isEcho,
    },
  };
}

async function handleInstagramComment(commentData, igAccount, agent) {
  try {
    logger.info(`Processing comment webhook payload: ${JSON.stringify(commentData)}`);
    
    // Ignore comments made by the page/account itself
    if (commentData?.from?.id === igAccount.igAccountId) {
      logger.info(`Ignored self-comment by the connected account (${igAccount.igUsername || igAccount.igAccountId})`);
      return;
    }

    const text = commentData.text;
    const commentId = commentData.id;

    if (!text || !commentId) {
      logger.warn(`Skipped comment due to missing text or commentId. Payload: ${JSON.stringify(commentData)}`);
      return;
    }

    const commenterId = commentData?.from?.id;

    webhookQueue.enqueue(`instagram_comment_${commenterId}`, async () => {
      try {

        // 1.5 Deduplicate comments
        let isDuplicate = false;
        try {
          const redis = require('../config/redis').redis;
          const dedupKey = `ig_comment_dedup:${commentId}`;
          const isNew = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
          if (!isNew) isDuplicate = true;
        } catch (redisErr) {
          logger.warn(`Redis deduplication failed for IG comment: ${redisErr.message}`);
          // Fallback: Proceed without deduplication since we don't save comments in DB
        }
        
        if (isDuplicate) {
          logger.info(`Comment ${commentId} from user ${commenterId} already processing/processed. Skipping duplicate webhook.`);
          return;
        }

        // Emit socket event to update frontend live for the incoming comment
        try {
          const { emitToUser } = require('../utils/socket');
          emitToUser(igAccount.user.toString(), 'new_instagram_comment', {
            accountId: igAccount._id,
            mediaId: commentData?.media?.id || null, // Might be null in some Meta payloads
          });
        } catch(e) {}

        const user = await User.findById(igAccount.user).select('+usage +subscription');
        const Plan = require('../models/Plan');
        const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
        const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

        // Check for Post-Specific Automation (PostAutomation) BEFORE the general enabled check
        const PostAutomation = require('../models/PostAutomation');
        let mediaId = commentData?.media?.id;
        const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
        
        // Defensive: If webhook payload doesn't include media.id, fetch it
        if (!mediaId && commentId) {
          logger.info(`media.id missing from webhook. Fetching comment details for ${commentId}`);
          const commentDetails = await igService.getCommentDetails(commentId);
          if (commentDetails && commentDetails.media) {
            mediaId = commentDetails.media.id;
          }
        }

        if (mediaId) {
          // Check Post AI Toggle
          const PostAIToggle = require('../models/PostAIToggle');
          const aiToggle = await PostAIToggle.findOne({
            platform: 'instagram',
            accountId: igAccount._id,
            mediaId: mediaId
          });
          
          if (aiToggle && aiToggle.isAiEnabled === false) {
            logger.info(`[POST AI TOGGLE] AI automation is manually disabled for media ${mediaId}. Skipping comment.`);
            return;
          }

          const postAutomation = await PostAutomation.findOne({
            platform: 'instagram',
            accountId: igAccount._id,
            mediaId: mediaId,
            isActive: true
          });

          logger.info(`[POST AUTOMATION CHECK] Finding config for media ${mediaId}. Found: ${!!postAutomation}`);

          if (postAutomation) {
            let matches = false;
            logger.info(`[POST AUTOMATION TRIGGERS] text="${text}", type="${postAutomation.triggerType}", keywords=${JSON.stringify(postAutomation.keywords)}`);

            if (postAutomation.triggerType === 'ALL_COMMENTS') {
              matches = true;
            } else if (postAutomation.triggerType === 'KEYWORD' && postAutomation.keywords && postAutomation.keywords.length > 0) {
              const lowerText = text.toLowerCase().trim();
              matches = postAutomation.keywords.some(kw => {
                const lowerKw = kw.toLowerCase().trim();
                return lowerKw && lowerText.includes(lowerKw);
              });
            }

            logger.info(`[POST AUTOMATION MATCH RESULT] matches=${matches}`);

            if (matches) {
              logger.info(`[POST AUTOMATION] Executing for Instagram Comment ${commentId} on media ${mediaId}`);
              
              if ((user.subscription?.credits ?? 0) < creditCost) {
                logger.warn(`User ${user._id} hit credit limit for AI comment responses`);
                return;
              }

              // 1. Send DM (Private Reply to Comment)
              if (postAutomation.dmMessage) {
                try {
                  await igService.sendPrivateReply(commentId, postAutomation.dmMessage);
                  logger.info(`Successfully sent Post Automation Private Reply DM for comment ${commentId}`);
                } catch (dmErr) {
                  logger.error(`Failed to send Post Automation Private Reply DM: ${dmErr.message}`);
                }
              }
              
              // 2. Reply to comment
              if (postAutomation.commentReply) {
                try {
                  await igService.replyToComment(igAccount.igAccountId, commentId, postAutomation.commentReply);
                  logger.info(`Successfully sent Post Automation reply to comment ${commentId}`);
                } catch (replyErr) {
                  logger.error(`Failed to send Post Automation reply: ${replyErr.message}`);
                }
              }

              // Deduct credits once if either action was taken
              const creditHelper = require('../utils/creditHelper');
              await creditHelper.deductCredits(igAccount.user, creditCost);
              await creditHelper.logTransaction({
                userId: igAccount.user,
                type: 'deduction',
                amount: creditCost,
                description: `AI Agent: Post Automation reply for media ${mediaId}`,
                metadata: { commentId, platform: 'instagram' },
              });
              
              
              // We handled the comment via Post Automation
            }
            
            // If a PostAutomation rule exists for this reel, we ALWAYS stop here.
            // This prevents the AI Comment Bot from interfering with the reel's comments.
            logger.info(`[POST AUTOMATION] Automation exists for media ${mediaId}. Halting AI bot for this reel.`);
            return;
          }
        } else {
          logger.warn(`[POST AUTOMATION SKIP] Could not determine mediaId for comment ${commentId}`);
        }

        const Agent = require('../models/Agent');
        const agent = await Agent.findOne({
          instagramAccount: igAccount._id,
          isActive: true
        });

        // 1. Check if bot is enabled for this account specifically OR via Agent
        let enabled = igAccount.commentBotEnabled;
        let systemPrompt = igAccount.commentBotPrompt || agent?.systemPrompt;

        if (!enabled) {
          logger.info(`[COMMENT SKIP]: Bot is disabled in settings for account: ${igAccount.igUsername || igAccount.igAccountId}`);
          return;
        }

        logger.info(`[COMMENT PROCESSING]: Found enabled bot for ${igAccount.igUsername}. Generating reply for: "${text}"`);



        // Check custom agent credit spend limit
        const agentLimit = user.subscription?.agentCreditLimit || 0;
        const agentUsed = user.usage?.agentCreditsUsedThisMonth || 0;
        if (agentLimit > 0 && agentUsed >= agentLimit) {
          logger.warn(`User ${user._id} hit custom Monthly Agent Credit Spend Limit (${agentUsed}/${agentLimit})`);
          return;
        }

        const limits = await user.getPlanLimits();
        if (user.usage.messagesThisMonth >= limits.messages) {
          logger.warn(`User ${user._id} hit message limit for AI comment responses`);
          return;
        }

        // Emit socket event to update frontend live for the incoming comment
        try {
          const { emitToUser } = require('../utils/socket');
          emitToUser(igAccount.user.toString(), 'new_instagram_comment', {
            accountId: igAccount._id,
            mediaId: commentData?.media?.id || null, // Might be null in some Meta payloads
          });
        } catch(e) {}

        logger.info(`[COMMENT PROCESSING]: Found enabled bot for ${igAccount.igUsername}. Generating reply for: "${text}"`);

        // 2. Generate AI response
        const contextMessages = [];
        const fullPrompt = (systemPrompt || "Reply to this Instagram comment.") + "\n\nRules: Keep it short, friendly, and under 2 sentences. Use emojis if appropriate.";

        // We can use a minimal mock agent object for AIService.generate
        const tempAgent = { 
          _id: `ig_comment_${igAccount._id}`,
          systemPrompt: fullPrompt,
          temperature: 0.7,
          contextWindow: 1
        };
        
        // Check for Keyword Triggers
        const matchedTrigger = await checkKeywordMatch(igAccount.organization, text, 'instagram', 'COMMENT', agent?._id);
        
        if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
            logger.info(`[KEYWORD TRIGGER] Matched trigger ${matchedTrigger._id} for Instagram Comment ${commentId}`);
            await igService.replyToComment(igAccount.igAccountId, commentId, matchedTrigger.response);
            logger.info(`Successfully sent custom keyword reply to comment ${commentId}`);
            return; // Skip AI
        }

        const aiResult = await AIService.generate(tempAgent, contextMessages, text);

        if (!aiResult || !aiResult.content) {
          logger.warn(`AI returned null content for Instagram Comment ${commentId}, aborting silent fail.`);
          return;
        }

        logger.info(`AI generated comment reply: ${aiResult.content}`);

        // Safety net: Never send canned error messages as comment replies
        if (aiResult.content.includes('experiencing some technical difficulties') || aiResult.content.includes('currently unable to process')) {
          logger.warn(`[COMMENT BOT] Blocked canned error message from being sent as comment reply for ${commentId}. Aborting.`);
          return;
        }

        await igService.replyToComment(igAccount.igAccountId, commentId, aiResult.content);

        logger.info(`Successfully replied to comment ${commentId}`);
        
        // Emit socket event to update frontend live
        try {
          const { emitToUser } = require('../utils/socket');
          emitToUser(igAccount.user.toString(), 'new_instagram_comment', {
            accountId: igAccount._id,
            mediaId: commentData?.media?.id || null,
          });
        } catch(e) { logger.warn('Failed to emit new_instagram_comment event'); }

        // We don't save comments in Conversations model to save DB space, but we bill the token usage & deduct credits safely
        await creditHelper.deductCredits(igAccount.user, creditCost);

        // Log transaction
        await creditHelper.logTransaction({
          userId: igAccount.user,
          type: 'deduction',
          amount: creditCost,
          description: `AI Agent: Instagram comment reply to comment ID ${commentId}`,
          metadata: { commentId, platform: 'instagram' },
        });
        if (agent) {
          await Agent.findByIdAndUpdate(agent._id, {
            $inc: { 'stats.totalMessages': 1 },
          });
        }
      } catch (error) {
        logger.error(`Error processing Instagram comment task: ${error.message}`, { stack: error.stack });
      }
    }, { platform: 'instagram', payload: { commenterId, commentId, text } });
  } catch (error) {
    logger.error(`Error in handleInstagramComment: ${error.message}`);
  }
}

async function handleInstagramMessageEdit(event, igAccount, agent) {
  const editedMid = event?.message_edit?.mid;
  const numEdit = event?.message_edit?.num_edit;
  const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);

  if (!editedMid) {
    logger.info('Skipping message_edit event due to missing mid');
    return;
  }

  webhookQueue.enqueue(`instagram_edit_${editedMid}`, async () => {
    try {
      // Fetch the current message text, attachments and sender from Graph API
      const messageMeta = await igService.resolveMessageSender(editedMid);
      const text = messageMeta?.message;
      const attachments = messageMeta?.attachments?.data; // Graph API returns attachments.data
      const metaSenderId = messageMeta?.from?.id;

      if ((!text && !attachments) || !metaSenderId) {
        // Meta Graph API often strips media/voice notes from GET requests for privacy, or fires phantom num_edit: 0 events
        logger.info(`message_edit received but skipped (no text/attachments from Graph API). Mid=${editedMid}`);
        return;
      }

      // Ignore edits/messages made by the connected account itself
      if (metaSenderId === igAccount.igAccountId) {
        logger.info(`message_edit event is from the connected account itself, ignoring. (mid=${editedMid})`);
        return;
      }

      logger.info(`Processing message_edit dynamically (mid=${editedMid}, num_edit=${numEdit ?? 0}, sender=${metaSenderId})`);

      let formattedAttachments = [];
      if (attachments && attachments.length > 0) {
        formattedAttachments = attachments.map(att => {
          let url = att.file_url || att.video_data?.url || att.image_data?.url;
          let type = 'unknown';
          if (att.mime_type?.includes('audio') || att.video_data) type = 'audio';
          else if (att.image_data) type = 'image';
          return { type: type, payload: { url: url } };
        });
      }

      // Construct a simulated standard message event
      const simulatedEvent = {
        sender: { id: metaSenderId },
        message: {
          mid: editedMid,
          text: text,
          is_echo: false,
          attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined
        },
        timestamp: event.timestamp || Date.now(),
      };

      // Pass it to the standard DM handler so the AI replies dynamically
      await handleInstagramDM(simulatedEvent, igAccount, agent);
    } catch (err) {
      logger.error(`Error processing Instagram message edit task: ${err.message}`, { stack: err.stack });
    }
  }, { platform: 'instagram', payload: { editedMid, numEdit } });
}
