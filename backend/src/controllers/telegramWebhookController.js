const TelegramService = require('../services/telegramService');
const AIService = require('../services/aiService');
const TelegramAccount = require('../models/TelegramAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const creditHelper = require('../utils/creditHelper');
const webhookQueue = require('../utils/webhookQueue');


exports.receiveMessage = async (req, res) => {
  // Always respond 200 immediately to Telegram
  res.status(200).json({ status: 'ok' });

  try {
    const { botUsername } = req.params;
    const parsed = TelegramService.parseWebhookMessage(req.body);
    if (!parsed || (!parsed.text && !parsed.contact)) return;

    const { messageId, chatId, fromId, fromName, fromUsername, text, contact, timestamp } = parsed;

    webhookQueue.enqueue(`telegram_${fromId}`, async () => {
      try {
        if (contact) {
          logger.info(`Received contact share from ${fromId}: ${contact.phone_number}`);
        }

        logger.info(`Incoming message from ${fromId} on bot ${botUsername}`);

        // 1. Find Telegram account
        const tgAccount = await TelegramAccount.findOne({
          botUsername,
          status: 'connected',
          isActive: true,
        }).select('+botToken');

        if (!tgAccount) {
          logger.warn(`No active Telegram account for botUsername: ${botUsername}`);
          return;
        }
        
        // 2. Find active agent for this account
        const agent = await Agent.findOne({
          telegramAccount: tgAccount._id,
          isActive: true,
        });
        
        if (!agent) {
          logger.warn(`No active agent for TG account: ${tgAccount._id}`);
          return;
        }

        // 3. Handle shared contact
        if (contact) {
          let conversation = await Conversation.findOne({
            telegramAccount: tgAccount._id,
            customerTgId: fromId.toString(),
          }).sort({ createdAt: -1 });

          if (!conversation) {
            conversation = await Conversation.create({
              user: tgAccount.user,
              organization: tgAccount.organization,
              agent: agent._id,
              telegramAccount: tgAccount._id,
              platform: 'telegram',
              customerTgId: fromId.toString(),
              customerUsername: fromUsername,
              customerName: fromName,
              customerPhone: contact.phone_number,
              status: 'active',
              lastMessageAt: new Date(),
            });
          } else {
            conversation.customerPhone = contact.phone_number;
            await conversation.addMessage({
              role: 'system',
              content: `System: Customer shared phone number: ${contact.phone_number}`,
              timestamp: new Date(),
            });
            await conversation.save();
          }

          const tgService = new TelegramService(tgAccount.botToken);
          await tgService.sendTextMessage(chatId, "✅ Thank you! Your phone number has been verified. How can we assist you today?");

          // Emit socket event to update UI in real-time
          emitToUser(tgAccount.user.toString(), 'conversation_updated', {
            conversationId: conversation._id,
            messages: await conversation.getRecentMessages(),
            customerPhone: conversation.customerPhone, // Explicitly pass the new phone
          });

          return;
        }

        // 4. Handle /start command
        if (text === '/start') {
          let conversation = await Conversation.findOne({
            telegramAccount: tgAccount._id,
            customerTgId: fromId.toString(),
          }).sort({ createdAt: -1 });

          if (!conversation) {
            conversation = await Conversation.create({
              user: tgAccount.user,
              organization: tgAccount.organization,
              agent: agent._id,
              telegramAccount: tgAccount._id,
              platform: 'telegram',
              customerTgId: fromId.toString(),
              customerUsername: fromUsername,
              customerName: fromName,
              status: 'active',
              lastMessageAt: new Date(),
            });
          } else if (conversation.status === 'closed') {
            conversation.status = 'active';
            await conversation.save();
          }

          const tgService = new TelegramService(tgAccount.botToken);
          const welcomeMsg = agent.greetingMessage || "Welcome! Please share your contact to continue.";
          await tgService.sendTextMessage(chatId, welcomeMsg, {
            reply_markup: {
              keyboard: [[{ text: "📱 Share Mobile Number", request_contact: true }]],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
          return;
        }

        // 5. Find or create conversation for general messages
        let conversation = await Conversation.findOne({
          telegramAccount: tgAccount._id,
          customerTgId: fromId.toString(),
        }).sort({ createdAt: -1 });
        
        if (!conversation) {
          conversation = await Conversation.create({
            user: tgAccount.user,
            organization: tgAccount.organization,
            agent: agent._id,
            telegramAccount: tgAccount._id,
            platform: 'telegram',
            customerTgId: fromId.toString(),
            customerUsername: fromUsername,
            customerName: fromName,
            status: 'active',
            lastMessageAt: new Date(),
          });
          
          // Send greeting if configured (and not handled by /start)
          if (agent.greetingMessage) {
            const tgService = new TelegramService(tgAccount.botToken);
            await tgService.sendTextMessage(chatId, agent.greetingMessage);
          }
        } else if (conversation.status === 'closed') {
          conversation.status = 'active';
          await conversation.addMessage({
            role: 'system',
            content: 'System: Conversation session was reset/reopened.',
            timestamp: new Date(),
          });
        }

        // Deduplicate by messageId
        const recentMsgs = await conversation.getRecentMessages();
      const isDuplicate = recentMsgs?.some(m => m.waMessageId === messageId.toString());
        if (isDuplicate) {
          logger.info(`Message ${messageId} from Telegram user ${fromId} already processed. Skipping duplicate webhook.`);
          return;
        }

        // If human handoff, just append message and do not trigger AI
        if (conversation.status === 'human_handoff') {
          await conversation.addMessage({
            role: 'user',
            content: text,
            waMessageId: messageId.toString(),
            type: 'text',
            timestamp: new Date(timestamp * 1000),
          });
          conversation.lastMessageAt = new Date();
          conversation.isRead = false;
          await conversation.save();

          emitNotification(tgAccount.user.toString(), {
            type: 'new_message',
            title: '✈️ New Telegram Message',
            message: `${fromName || fromUsername || fromId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
            conversationId: conversation._id,
            platform: 'telegram',
          });
          return;
        }

        // 4. Check business hours
        const withinHours = AIService.isWithinBusinessHours(agent.businessHours);
        if (!withinHours && agent.outOfHoursMessage) {
          const tgService = new TelegramService(tgAccount.botToken);
          await tgService.sendTextMessage(chatId, agent.outOfHoursMessage);
          return;
        }

        // 5. Check human handoff keywords
        if (AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
          conversation.status = 'human_handoff';
          await conversation.addMessage({
            role: 'user',
            content: text,
            waMessageId: messageId.toString(),
            type: 'text',
            timestamp: new Date(timestamp * 1000),
          });
          await conversation.addMessage({
            role: 'system',
            content: 'System: 🔴 HUMAN HANDOFF REQUESTED. Email notification sent to admin.',
            timestamp: new Date(),
          });
          conversation.lastMessageAt = new Date();
          conversation.isRead = false;
          await conversation.save();
          
          emitToUser(tgAccount.user.toString(), 'conversation_updated', {
            conversationId: conversation._id,
            messages: await conversation.getRecentMessages(),
          });

          emitNotification(tgAccount.user.toString(), {
            type: 'human_handoff',
            title: '🔴 Human Handoff Requested',
            message: `Telegram: ${fromName || fromUsername || fromId} needs human support.`,
            conversationId: conversation._id,
            platform: 'telegram',
          });

          logger.info(`[EMAIL ALERT] Human handoff triggered for TG conversation: ${conversation._id}`);

          const tgService = new TelegramService(tgAccount.botToken);
          await tgService.sendTextMessage(chatId, agent.humanHandoffMessage);
          return;
        }

        // 6. Check user message limit & credits
        const user = await User.findById(tgAccount.user).select('+usage +subscription');
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
          content: text,
          waMessageId: messageId.toString(),
          type: 'text',
          timestamp: new Date(timestamp * 1000),
        });

        // 8. Get recent context window
        const contextMessages = await conversation.getRecentMessages(20)
          .filter((m) => m.role !== 'system')
          .slice(-(agent.contextWindow * 2))
          .map((m) => ({ role: m.role, content: m.content }));

        // 9. Generate AI response
        const aiResult = await AIService.generate(agent, contextMessages.slice(0, -1), text);
      
        // 10. Send AI reply
        const tgService = new TelegramService(tgAccount.botToken);
        const sentMsg = await tgService.sendTextMessage(chatId, aiResult.content || "this is new AI reply");

        // 11. Save assistant message
        await conversation.addMessage({
          role: 'assistant',
          content: aiResult.content,
          waMessageId: sentMsg?.result?.message_id?.toString(),
          type: 'text',
          status: 'sent',
          tokens: aiResult.tokensUsed,
          responseTime: aiResult.responseTime,
        });

        conversation.totalMessages += 2;
        conversation.totalTokensUsed += aiResult.tokensUsed;
        conversation.lastMessageAt = new Date();
        conversation.isRead = false;
        await conversation.save();

        emitToUser(tgAccount.user.toString(), 'conversation_updated', {
          conversationId: conversation._id,
          messages: await conversation.getRecentMessages(),
        });

        emitNotification(tgAccount.user.toString(), {
          type: 'new_message',
          title: '✈️ New Telegram Message',
          message: `${fromName || fromUsername || fromId}: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`,
          conversationId: conversation._id,
          platform: 'telegram',
        });

        // 12. Update usage counters & deduct credits safely
        await creditHelper.deductCredits(tgAccount.user, creditCost);

        // Log transaction
        await creditHelper.logTransaction({
          userId: tgAccount.user,
          type: 'deduction',
          amount: creditCost,
          description: `AI Agent: Telegram reply to ${fromName || fromUsername || fromId}`,
          metadata: { conversationId: conversation._id, platform: 'telegram' },
        });

        // 13. Update agent stats
        await Agent.findByIdAndUpdate(agent._id, {
          $inc: {
            'stats.totalMessages': 2,
            'stats.totalConversations': conversation.totalMessages === 2 ? 1 : 0,
          },
        });

        logger.info(`AI reply sent to TG ${fromId} in ${aiResult.responseTime}ms`);
      } catch (err) {
        logger.error(`Error processing Telegram webhook task: ${err.message}`, { stack: err.stack });
      }
    }, { platform: 'telegram', payload: { fromId, chatId, messageId, text, contact } });

  } catch (err) {
    logger.error('Telegram Webhook processing error:', err.message || (err.errors ? JSON.stringify(err.errors) : err));
  }
};
