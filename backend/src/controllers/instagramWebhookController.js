const InstagramService = require('../services/instagramService');
const AIService = require('../services/aiService');
const InstagramAccount = require('../models/InstagramAccount');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const logger = require('../utils/logger');
const { emitToUser, emitNotification } = require('../utils/socket');
const creditHelper = require('../utils/creditHelper');
const webhookQueue = require('../utils/webhookQueue');
const SystemSetting = require('../models/SystemSetting');
const { generateSpeech, deleteTempAudio, transcribeAudio, convertAudioToVideo } = require('../utils/audioHelper');
const CloudinaryService = require('../services/cloudinaryService');
const os = require('os');
const path = require('path');

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
  // 1. Immediate Heartbeat Log to verify connectivity
  logger.info(`>>> INSTAGRAM WEBHOOK ENDPOINT HIT: ${req.method} ${req.originalUrl}`);
  
  res.status(200).send('EVENT_RECEIVED'); // Always respond 200 immediately

  try {
    const { body } = req;
    logger.info(`[INSTAGRAM WEBHOOK RECEIVED]: ${JSON.stringify(body, null, 2)}`);

    if (body.object !== 'instagram') return;

    for (const entry of body.entry) {
      const igAccountId = entry.id; // Instagram account ID that received the message
      const changes = entry.changes; // For comments
      const messaging = entry.messaging; // For DMs

      if (igAccountId === '0') {
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
        logger.warn(`Instagram account not found in DB or disconnected for ID: ${igAccountId}`);
        continue;
      }

      // 2. Find active agent
      const agent = await Agent.findOne({
        instagramAccount: igAccount._id,
        isActive: true,
      });

      if (!agent) {
        logger.warn(`No active agent found for Instagram account ID: ${igAccountId}`);
        continue;
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
            if (dmEvent) {
              await handleInstagramDM(dmEvent, igAccount, agent);
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
      let conversation = await Conversation.findOne({
        instagramAccount: igAccount._id,
        customerIgId: senderId,
      }).sort({ createdAt: -1 });

      if (!conversation) {
        const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
        const profile = await igService.getCustomerProfile(senderId);
        const customerName = profile?.name || profile?.username || '';
        
        conversation = await Conversation.create({
          user: igAccount.user,
          organization: igAccount.organization,
          agent: agent._id,
          instagramAccount: igAccount._id,
          platform: 'instagram',
          customerIgId: senderId,
          customerName: customerName,
          customerUsername: profile?.username || '',
          status: 'active',
          lastMessageAt: new Date(),
        });
      } else if (conversation.status === 'closed') {
        conversation.status = 'active';
        await conversation.addMessage({
          role: 'system',
          content: 'System: Conversation session was reset/reopened.',
          timestamp: new Date(),
        });
      }

      // Deduplicate by messageId to prevent multiple replies for the same message/edit
      const recentMsgs = await conversation.getRecentMessages();
      const isDuplicate = recentMsgs?.some(m => m.waMessageId === messageId);
      if (isDuplicate) {
        logger.info(`Message ${messageId} from Instagram user ${senderId} already processed. Skipping duplicate webhook.`);
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
          content: text || '[Audio Message]',
          waMessageId: messageId,
          type: 'text',
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

      // Check human handoff keywords
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

      // Check limits & credits
      const user = await User.findById(igAccount.user).select('+usage +subscription');
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
        content: text || '[Audio Message]',
        waMessageId: messageId,
        type: 'text',
        timestamp: new Date(),
      });

      const contextMessages = await conversation.getRecentMessages(20)
        .filter((m) => m.role !== 'system')
        .slice(-(agent.contextWindow * 2))
        .map((m) => ({ role: m.role, content: m.content }));

      const wantsVoice = isVoiceRequest(text) || isAudioRequest;

      const aiResult = await AIService.generate(agent, contextMessages.slice(0, -1), text);

      let sentMsg;
      let audioSent = false;
      
      const audioSetting = await SystemSetting.findOne({ key: 'instagram_audio_enabled' });
      const instagramAudioEnabled = audioSetting ? audioSetting.value : true;

      if (wantsVoice && instagramAudioEnabled) {
        try {
          logger.info(`Voice intent detected for Instagram DM from ${senderId}. Generating audio...`);
          
          // Generate local MP3
          const localAudioPath = await generateSpeech(aiResult.content, agent.language || 'en-US');
          
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
          audioSent = true;

          // Cleanup local files
          await deleteTempAudio(localAudioPath);
          await deleteTempAudio(tempVideoPath);
        } catch (audioError) {
          logger.error(`Error in Instagram TTS flow for ${senderId}: ${audioError.message}`);
          // Fallback to text
        }
      }

      if (!wantsVoice || !audioSent || !instagramAudioEnabled) {
        sentMsg = await igService.sendTextMessage(igAccount.igAccountId, senderId, aiResult.content);
      }

      await conversation.addMessage({
        role: 'assistant',
        content: aiResult.content,
        waMessageId: sentMsg?.message_id || sentMsg?.id || messageId,
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
    } catch (err) {
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
        // 1. Check if bot is enabled for this account specifically OR via Agent
        let enabled = igAccount.commentBotEnabled;
        let systemPrompt = igAccount.commentBotPrompt;

        if (!enabled) {
          logger.info(`[COMMENT SKIP]: Bot is disabled in settings for account: ${igAccount.igUsername || igAccount.igAccountId}`);
          return;
        }

        logger.info(`[COMMENT PROCESSING]: Found enabled bot for ${igAccount.igUsername}. Generating reply for: "${text}"`);

        // Check limits & credits
        const user = await User.findById(igAccount.user).select('+usage +subscription');
        const Plan = require('../models/Plan');
        const userPlan = await Plan.findOne({ code: user.subscription?.plan || 'free' });
        const creditCost = userPlan ? userPlan.agentMsgCreditCost : 1;

        if ((user.subscription?.credits ?? 0) < creditCost) {
          logger.warn(`User ${user._id} hit credit limit for AI comment responses`);
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
          logger.warn(`User ${user._id} hit message limit for AI comment responses`);
          return;
        }

        // 2. Generate AI response
        const contextMessages = [];
        const fullPrompt = (systemPrompt || "Reply to this Instagram comment.") + "\n\nRules: Keep it short, friendly, and under 2 sentences. Use emojis if appropriate.";

        // We can use a minimal mock agent object for AIService.generate
        const tempAgent = { 
          systemPrompt: fullPrompt,
          temperature: 0.7,
          contextWindow: 1
        };
        
        const aiResult = await AIService.generate(tempAgent, contextMessages, text);

        logger.info(`AI generated comment reply: ${aiResult.content}`);

        const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
        await igService.replyToComment(igAccount.igAccountId, commentId, aiResult.content);

        logger.info(`Successfully replied to comment ${commentId}`);

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
        await Agent.findByIdAndUpdate(agent._id, {
          $inc: { 'stats.totalMessages': 1 },
        });
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
