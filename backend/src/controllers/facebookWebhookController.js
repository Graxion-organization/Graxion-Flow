const FacebookService = require('../services/facebookService');
const AIService = require('../services/aiService');
const FacebookAccount = require('../models/FacebookAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const creditHelper = require('../utils/creditHelper');
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
  logger.info(`>>> FACEBOOK WEBHOOK ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  
  res.status(200).send('EVENT_RECEIVED');

  try {
    const { body } = req;
    logger.info(`[FACEBOOK WEBHOOK RECEIVED]: ${JSON.stringify(body, null, 2)}`);

    if (body.object !== 'page') return;

    for (const entry of body.entry) {
      const pageId = entry.id;
      const messaging = entry.messaging;

      if (!messaging) continue;

      // 1. Find Facebook account
      const fbAccount = await FacebookAccount.findOne({
        pageId,
        status: 'connected',
        isActive: true,
      }).select('+pageAccessToken');

      if (!fbAccount) {
        logger.warn(`Facebook account not found or disconnected for Page ID: ${pageId}`);
        continue;
      }

      // 2. Find active agent
      const agent = await Agent.findOne({
        facebookAccount: fbAccount._id,
        isActive: true,
      });

      if (!agent) {
        logger.warn(`No active agent found for Facebook account Page ID: ${pageId}`);
        continue;
      }

      // 3. Process Messaging Events
      for (const event of messaging) {
        if (event.message && !event.message.is_echo) {
          await handleFacebookMessage(event, fbAccount, agent);
        } else {
          logger.info(`Skipping non-message event: ${JSON.stringify(event)}`);
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

  if (!senderId || !messageId || !text) return;

  webhookQueue.enqueue(`facebook_${senderId}`, async () => {
    try {
      // Find or create conversation
      let conversation = await Conversation.findOne({
        facebookAccount: fbAccount._id,
        customerFbId: senderId,
      }).sort({ createdAt: -1 });

      const fbService = new FacebookService(fbAccount.pageAccessToken, fbAccount.pageId);

      if (!conversation) {
        const profile = await fbService.getCustomerProfile(senderId);
        const customerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
        
        conversation = await Conversation.create({
          user: fbAccount.user,
          organization: fbAccount.organization,
          agent: agent._id,
          facebookAccount: fbAccount._id,
          platform: 'facebook',
          customerFbId: senderId,
          customerName: customerName || 'Messenger User',
          status: 'active',
          lastMessageAt: new Date(),
        });
      } else if (conversation.status === 'closed') {
        conversation.status = 'active';
      }

      // Handle Human Handoff
      if (conversation.status === 'human_handoff') {
        await saveMessageAndEmit(conversation, fbAccount, 'user', text, messageId);
        return;
      }

      // Check Handoff Keywords
      if (AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
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

      // AI Response Logic & Credit Checks
      const user = await User.findById(fbAccount.user).select('+usage +subscription');
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
      if (user.usage.messagesThisMonth >= limits.messages) return;

      await conversation.addMessage({
        role: 'user',
        content: text,
        waMessageId: messageId,
        type: 'text',
        timestamp: new Date(),
      });

      const contextMessages = await conversation.getRecentMessages(20)
        .filter((m) => m.role !== 'system')
        .slice(-(agent.contextWindow * 2))
        .map((m) => ({ role: m.role, content: m.content }));

      // Typing indicator
      await fbService.sendAction(senderId, 'typing_on');

      const aiResult = await AIService.generate(agent, contextMessages.slice(0, -1), text);

      const sentMsg = await fbService.sendTextMessage(senderId, aiResult.content);

      await conversation.addMessage({
        role: 'assistant',
        content: aiResult.content,
        waMessageId: sentMsg.message_id,
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
