const FacebookService = require('../services/facebookService');
const AIService = require('../services/aiService');
const FacebookAccount = require('../models/FacebookAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const creditHelper = require('../utils/creditHelper');
const { checkKeywordMatch } = require('../utils/keywordMatcher');
const webhookQueue = require('../utils/webhookQueue');


exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'] || req.query['hub_mode'];
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      logger.info('Facebook Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }
  res.status(400).send('Bad request');
};

exports.receiveMessage = async (req, res) => {
  logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] >>> ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  logger.info(`>>> FACEBOOK WEBHOOK ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  
  res.status(200).send('EVENT_RECEIVED');

  try {
    const { body } = req;
    logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] Received payload: ${JSON.stringify(body)}`);
    logger.info(`[FACEBOOK WEBHOOK RECEIVED]: ${JSON.stringify(body, null, 2)}`);

    if (body.object !== 'page') {
      logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] Object is not 'page'. Skipping.`);
      return;
    }

    for (const entry of body.entry) {
      const pageId = entry.id;
      const messaging = entry.messaging;
      const changes = entry.changes; // For comments

      if (!messaging && !changes) continue;

      // 1. Find Facebook account
      const fbAccount = await FacebookAccount.findOne({
        pageId,
        status: 'connected',
        isActive: true,
      }).select('+pageAccessToken');

      if (!fbAccount) {
        logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] Account not found or disconnected for Page ID: ${pageId}. Skipping.`);
        logger.warn(`Facebook account not found or disconnected for Page ID: ${pageId}`);
        continue;
      }
      logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] Found FB Account: ${fbAccount.pageName || pageId}`);

      // Verify organization is active (leakage prevention)
      const Organization = require('../models/Organization');
      const org = await Organization.findOne({ _id: fbAccount.organization, isActive: true });
      if (!org) {
        logger.info(`[RENDER_LOG] [FACEBOOK_WEBHOOK] Organization ${fbAccount.organization} is suspended/inactive. Skipping.`);
        logger.warn(`Organization ${fbAccount.organization} is suspended/inactive. Blocking Facebook automation.`);
        continue;
      }

      // 2. Find active agent (optional, falls back to account-level settings)
      const agent = await Agent.findOne({
        facebookAccount: fbAccount._id,
        isActive: true,
      });

      if (!agent) {
        logger.info(`No active agent found for Facebook Page ID: ${pageId}. Will use account-level bot settings if enabled.`);
      }

      // 3. Process Messaging Events
      if (messaging) {
        for (const event of messaging) {
          if (event.message && !event.message.is_echo) {
            await handleFacebookMessage(event, fbAccount, agent);
          } else {
            logger.info(`Skipping non-message event: ${JSON.stringify(event)}`);
          }
        }
      }

      // 4. Process Feed/Comment Events (AI Auto-Reply)
      if (changes) {
        for (const change of changes) {
          if (change.field === 'feed' && change.value && change.value.item === 'comment') {
            logger.info(`Received Facebook comment from ${change.value.from?.name}`);
            await handleFacebookComment(change.value, fbAccount, agent);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Facebook Webhook processing error: ${err.message || (err.errors ? JSON.stringify(err.errors) : err)}`, { stack: err.stack });
  }
};

async function handleFacebookMessage(event, fbAccount, agent) {
  const senderId = event.sender.id;
  const messageId = event.message.mid;
  const text = event.message.text;

  logger.info(`Received Facebook message from ${senderId}`);

  if (!senderId || !messageId || !text) {
    logger.info(`[RENDER_LOG] [FACEBOOK_DM] Skipping DM event due to missing senderId, messageId, or text`);
    return;
  }

  // Deduplicate using Redis atomic lock
  let isDuplicate = false;
  try {
    const redis = require('../config/redis').redis;
    const dedupKey = `fb_dedup:${messageId}`;
    const isNew = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
    if (!isNew) isDuplicate = true;
  } catch (redisErr) {
    logger.warn(`Redis deduplication failed for FB: ${redisErr.message}`);
    // Will naturally fallback to checking the DB later in the queue processing
  }
  
  if (isDuplicate) {
    logger.info(`[RENDER_LOG] [FACEBOOK_DM] DUPLICATE DETECTED: Message ${messageId} already processed. Skipping.`);
    logger.info(`Facebook message ${messageId} already processing/processed. Skipping duplicate webhook.`);
    return;
  }

  webhookQueue.enqueue(`facebook_${senderId}`, async () => {
    try {
      logger.info(`[RENDER_LOG] [FACEBOOK_DM] Webhook enqueued for senderId: ${senderId}, messageId: ${messageId}`);
      // Find or create conversation (Query by organization to prevent duplicates if account is reconnected)
      let conversation = await Conversation.findOne({
        organization: fbAccount.organization,
        platform: 'facebook',
        customerFbId: senderId,
      }).sort({ createdAt: -1 });

      const fbService = new FacebookService(fbAccount.pageAccessToken, fbAccount.pageId);
      const agentId = agent ? agent._id : null;

      if (!conversation) {
        const profile = await fbService.getCustomerProfile(senderId);
        const customerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
        
        conversation = await Conversation.create({
          user: fbAccount.user,
          organization: fbAccount.organization,
          agent: agentId,
          facebookAccount: fbAccount._id,
          platform: 'facebook',
          customerFbId: senderId,
          customerName: customerName || 'Messenger User',
          status: 'active',
          lastMessageAt: new Date(),
        });
      } else {
        if (conversation.status === 'closed') {
          conversation.status = 'active';
        }
        if (conversation.facebookAccount?.toString() !== fbAccount._id.toString()) {
          conversation.facebookAccount = fbAccount._id;
          await conversation.save();
        }
      }

      // Handle Human Handoff
      if (conversation.status === 'human_handoff') {
        await saveMessageAndEmit(conversation, fbAccount, 'user', text, messageId);
        return;
      }

      // Check Handoff Keywords
      if (agent && AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
        conversation.status = 'human_handoff';
        await conversation.addMessage({
          role: 'user',
          content: text,
          waMessageId: messageId,
          type: 'text',
          timestamp: new Date(),
        });
        await conversation.addMessage({
          role: 'system',
          content: 'System: 🔴 HUMAN HANDOFF REQUESTED.',
          timestamp: new Date(),
        });
        await conversation.save();
        
        emitToUser(fbAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: await conversation.getRecentMessages(),
        });

        emitNotification(fbAccount.user.toString(), {
          type: 'human_handoff',
          title: '🔴 Messenger Handoff Requested',
          message: `Facebook: ${conversation.customerName} needs human support.`,
          conversationId: conversation._id,
          platform: 'facebook',
        });

        await fbService.sendTextMessage(senderId, agent.humanHandoffMessage);
        return;
      }

      // Detect Bot Loop (Rate Limiter: max 10 messages per minute per conversation)
      try {
        const redis = require('../config/redis').redis;
        const loopKey = `bot_loop_fb:${conversation._id}`;
        const msgCount = await redis.incr(loopKey);
        if (msgCount === 1) await redis.expire(loopKey, 60);
        
        if (msgCount > 10) {
          logger.warn(`[BOT LOOP DETECTED] Facebook Conversation ${conversation._id} exceeded 10 msgs/min. Pausing AI.`);
          if (conversation.status !== 'human_handoff') {
            conversation.status = 'human_handoff';
            await conversation.addMessage({
              role: 'system',
              content: 'System: 🔴 AUTOMATIC BOT LOOP DETECTED. Rate limit exceeded (>10 messages per minute). AI Agent has been paused for safety. Admin must manually re-enable AI for this chat.',
              timestamp: new Date(),
            });
            await conversation.save();
            emitToUser(fbAccount.user.toString(), 'conversation_updated', {
              conversationId: conversation._id,
              messages: await conversation.getRecentMessages(),
            });
          }
          return;
        }
      } catch (loopErr) {
        logger.error(`Error in bot loop detection (FB): ${loopErr.message}`);
      }

      // AI Response Logic & Credit Checks
      const user = await User.findById(fbAccount.user).select('+usage +subscription');
      const Plan = require('../models/Plan');
      const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
      const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

      if ((user.subscription?.credits ?? 0) < creditCost) {
        logger.info(`[RENDER_LOG] [FACEBOOK_DM] User ${user._id} hit credit limit (${user.subscription?.credits} credits). Skipping AI.`);
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
        content: text,
        waMessageId: messageId,
        type: 'text',
        timestamp: new Date(),
      });
      conversation.lastMessageAt = new Date();
      conversation.isRead = false;
      await conversation.save();

      // IMMEDIATE UI UPDATE: Emit event and notification before AI starts processing
      emitToUser(fbAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
        customerPhone: conversation.customerPhone || senderId
      });

      emitNotification(fbAccount.user.toString(), {
        type: 'new_message',
        title: '💬 New Facebook Message',
        message: `${conversation.customerName || senderId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
        conversationId: conversation._id,
        platform: 'facebook',
      });

      const contextWindow = agent ? agent.contextWindow : 10;
      const contextMessages = (await conversation.getRecentMessages(20))
        .filter((m) => m.role !== 'system')
        .slice(-(contextWindow * 2))
        .map((m) => ({ role: m.role, content: m.content }));

      // Check if bot is actually enabled
      let enabled = fbAccount.messengerBotEnabled;
      if (!enabled) {
        logger.info(`[RENDER_LOG] [FACEBOOK_DM] Bot is disabled in settings for page: ${fbAccount.pageName}. Skipping AI.`);
        logger.info(`[FB DM SKIP]: Messenger bot is disabled for page: ${fbAccount.pageName}`);
        return;
      }

      // Typing indicator
      await fbService.sendAction(senderId, 'typing_on');

      // Check for Keyword Triggers
      const matchedTrigger = await checkKeywordMatch(fbAccount.organization, text, 'facebook', 'DM', agent?._id);
      
      if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
        logger.info(`[KEYWORD TRIGGER] Matched trigger ${matchedTrigger._id} for Facebook DM from ${senderId}`);
        // FacebookService currently only supports text message method natively in our codebase for DMs.
        // If they need image/media, we'd add it to fbService similar to IG. For now, we'll send text.
        // We blocked 'document' for FB, so mediaType would be none, image, video, audio. Let's just send the text response if there is one.
        // If we want to support media properly, we'll add fbService.sendMediaMessage.
        // Given we don't have it right now, let's fallback to text.
        
        // Actually, we can just send the text response. If there's mediaUrl, we can append it as a link in text for now, 
        // or just ignore if the user didn't specify text. We'll send the response text.
        const sentText = matchedTrigger.response || (matchedTrigger.mediaUrl ? `Attachment: ${matchedTrigger.mediaUrl}` : '[Action Triggered]');
        const sentMsg = await fbService.sendTextMessage(senderId, sentText);

        await conversation.addMessage({
          role: 'assistant',
          content: sentText,
          waMessageId: sentMsg?.message_id,
          type: 'text',
          status: 'sent',
          tokens: 0,
          responseTime: 0,
        });

        conversation.totalMessages += 2;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        await fbService.sendAction(senderId, 'typing_off');
        return; // Skip AI
      }

      emitToUser(fbAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: true });
      
      const tempAgent = agent || {
          systemPrompt: fbAccount.messengerBotPrompt || "You are a helpful assistant. Reply to this Facebook message in a friendly way. Keep it short.",
          temperature: 0.7,
          contextWindow: 10,
          aiProvider: 'openai',
          model: 'gpt-4o-mini'
      };

      logger.info(`[RENDER_LOG] [FACEBOOK_DM] Passing to AI with text: "${text}"`);
      const aiResult = await AIService.generate(tempAgent, contextMessages.slice(0, -1), text, 'facebook');
      logger.info(`[RENDER_LOG] [FACEBOOK_DM] AI generated reply: "${aiResult.content}"`);
      emitToUser(fbAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });
      
      if (!aiResult || !aiResult.content) {
        logger.warn(`AI returned null content for Facebook DM from ${senderId}, aborting silent fail.`);
        return;
      }

      const cleanReply = AIService.sanitizeForPlatform(aiResult.content, 'facebook');
      const sentMsg = await fbService.sendTextMessage(senderId, cleanReply || "I am currently unable to process that request.");
      logger.info(`[RENDER_LOG] [FACEBOOK_DM] Successfully sent reply to Facebook user.`);

      await conversation.addMessage({
        role: 'assistant',
        content: cleanReply,
        waMessageId: sentMsg?.message_id,
        type: 'text',
        status: 'sent',
        tokens: aiResult.tokensUsed,
        responseTime: aiResult.responseTime,
      });

      conversation.totalMessages += 2;
      conversation.totalTokensUsed += aiResult.tokensUsed;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      emitToUser(fbAccount.user.toString(), 'conversation_updated', {
        conversationId: conversation._id,
        messages: await conversation.getRecentMessages(),
      });

      // Safely deduct credits and increment usage counters
      await creditHelper.deductCredits(fbAccount.user, creditCost);

      // Log transaction
      await creditHelper.logTransaction({
        userId: fbAccount.user,
        type: 'deduction',
        amount: creditCost,
        description: `AI Agent: Facebook Messenger reply to ${conversation.customerName || senderId}`,
        metadata: { conversationId: conversation._id, platform: 'facebook' },
      });
      
      await fbService.sendAction(senderId, 'typing_off');
    } catch (err) {
      logger.error(`[RENDER_LOG] [FACEBOOK_DM] Error processing DM: ${err.message}`, err.stack);
      if (conversation?._id && fbAccount?.user) {
        emitToUser(fbAccount.user.toString(), 'ai_typing', { conversationId: conversation._id, isTyping: false });
      }
      logger.error(`Error processing Facebook message task: ${err.message}`, { stack: err.stack });
    }
  }, { platform: 'facebook', payload: { senderId, messageId, text } });
}

async function saveMessageAndEmit(conversation, fbAccount, role, content, messageId) {
  await conversation.addMessage({
    role,
    content,
    waMessageId: messageId,
    type: 'text',
    timestamp: new Date(),
  });
  conversation.lastMessageAt = new Date();
  conversation.isRead = false;
  await conversation.save();

  emitToUser(fbAccount.user.toString(), 'conversation_updated', {
    conversationId: conversation._id,
    messages: await conversation.getRecentMessages(),
  });

  emitNotification(fbAccount.user.toString(), {
    type: 'new_message',
    title: '💬 New Messenger Message',
    message: `${conversation.customerName}: ${content.slice(0, 60)}`,
    conversationId: conversation._id,
    platform: 'facebook',
  });
}

// ==========================================
// FACEBOOK COMMENT AUTO-REPLY HANDLER
// ==========================================
async function handleFacebookComment(commentData, fbAccount, agent) {
  try {
    logger.info(`Processing Facebook comment webhook: ${JSON.stringify(commentData)}`);

    // Ignore comments made by the page itself
    if (commentData.from?.id === fbAccount.pageId) {
      logger.info(`Ignored self-comment by page (${fbAccount.pageName || fbAccount.pageId})`);
      return;
    }

    const text = commentData.message;
    const commentId = commentData.comment_id;
    const postId = commentData.post_id;
    const commenterId = commentData.from?.id;

    if (!text || !commentId) {
      logger.warn(`Skipped FB comment due to missing text or commentId. Payload: ${JSON.stringify(commentData)}`);
      return;
    }

    // Emit socket event immediately for live UI update
    try {
      emitToUser(fbAccount.user.toString(), 'new_facebook_comment', {
        accountId: fbAccount._id,
        mediaId: postId || null,
      });
    } catch (e) {}

    webhookQueue.enqueue(`facebook_comment_${commenterId}`, async () => {
      try {
        // Check Post AI Toggle
        if (postId) {
          const PostAIToggle = require('../models/PostAIToggle');
          const aiToggle = await PostAIToggle.findOne({
            platform: 'facebook',
            accountId: fbAccount._id,
            mediaId: postId
          });
          
          if (aiToggle && aiToggle.isAiEnabled === false) {
            logger.info(`[POST AI TOGGLE] AI automation is manually disabled for FB post ${postId}. Skipping comment.`);
            return;
          }
        }

        // Check if comment bot is enabled
        let enabled = fbAccount.commentBotEnabled;
        let systemPrompt = fbAccount.commentBotPrompt || agent?.systemPrompt;

        if (!enabled) {
          logger.info(`[FB COMMENT SKIP]: Comment bot is disabled for page: ${fbAccount.pageName || fbAccount.pageId}`);
          return;
        }

        // Deduplicate using Redis
        let isDuplicate = false;
        try {
          const redis = require('../config/redis').redis;
          const dedupKey = `fb_comment_dedup:${commentId}`;
          const isNew = await redis.set(dedupKey, '1', 'EX', 3600, 'NX');
          if (!isNew) isDuplicate = true;
        } catch (redisErr) {
          logger.warn(`Redis deduplication failed for FB comment: ${redisErr.message}`);
        }

        if (isDuplicate) {
          logger.info(`FB Comment ${commentId} already processed. Skipping duplicate.`);
          return;
        }

        logger.info(`[FB COMMENT PROCESSING]: Generating AI reply for comment: "${text}"`);

        // Check credits
        const user = await User.findById(fbAccount.user).select('+usage +subscription');
        const Plan = require('../models/Plan');
        const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
        const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

        if ((user.subscription?.credits ?? 0) < creditCost) {
          logger.warn(`User ${user._id} hit credit limit for FB comment auto-reply`);
          return;
        }

        // Check custom agent credit spend limit
        const agentLimit = user.subscription?.agentCreditLimit || 0;
        const agentUsed = user.usage?.agentCreditsUsedThisMonth || 0;
        if (agentLimit > 0 && agentUsed >= agentLimit) {
          logger.warn(`User ${user._id} hit Monthly Agent Credit Spend Limit (${agentUsed}/${agentLimit})`);
          return;
        }

        const limits = await user.getPlanLimits();
        if (user.usage.messagesThisMonth >= limits.messages) {
          logger.warn(`User ${user._id} hit message limit for FB comment auto-reply`);
          return;
        }

        // Check for Keyword Triggers
        const matchedTrigger = await checkKeywordMatch(fbAccount.organization, text, 'facebook', 'COMMENT', agent?._id);
        const fbService = new FacebookService(fbAccount.pageAccessToken, fbAccount.pageId);

        if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
          logger.info(`[KEYWORD TRIGGER] Matched trigger for FB Comment ${commentId}`);
          await fbService.replyToComment(commentId, matchedTrigger.response);
          logger.info(`Successfully sent keyword reply to FB comment ${commentId}`);
          // Emit for live UI
          try {
            emitToUser(fbAccount.user.toString(), 'new_facebook_comment', {
              accountId: fbAccount._id,
              mediaId: postId || null,
            });
          } catch (e) {}
          return;
        }

        // Generate AI response
        const fullPrompt = (systemPrompt || "Reply to this Facebook comment.") + "\n\nRules: Keep it short, friendly, and under 2 sentences. Use emojis if appropriate.";
        const tempAgent = {
          systemPrompt: fullPrompt,
          temperature: 0.7,
          contextWindow: 1
        };

        const aiResult = await AIService.generate(tempAgent, [], text);

        if (!aiResult || !aiResult.content) {
          logger.warn(`AI returned null content for Facebook Comment ${commentId}, aborting silent fail.`);
          return;
        }

        logger.info(`AI generated FB comment reply: ${aiResult.content}`);

        await fbService.replyToComment(commentId, aiResult.content);
        logger.info(`Successfully replied to FB comment ${commentId}`);

        // Emit socket event for live UI update after reply
        try {
          emitToUser(fbAccount.user.toString(), 'new_facebook_comment', {
            accountId: fbAccount._id,
            mediaId: postId || null,
          });
        } catch (e) {}

        // Deduct credits
        await creditHelper.deductCredits(fbAccount.user, creditCost);

        // Log transaction
        await creditHelper.logTransaction({
          userId: fbAccount.user,
          type: 'deduction',
          amount: creditCost,
          description: `AI Agent: Facebook comment reply to comment ID ${commentId}`,
          metadata: { commentId, platform: 'facebook' },
        });

        if (agent) {
          await Agent.findByIdAndUpdate(agent._id, {
            $inc: { 'stats.totalMessages': 1 },
          });
        }
      } catch (error) {
        logger.error(`Error processing Facebook comment task: ${error.message}`, { stack: error.stack });
      }
    }, { platform: 'facebook', payload: { commenterId, commentId, text } });
  } catch (error) {
    logger.error(`Error in handleFacebookComment: ${error.message}`);
  }
}
