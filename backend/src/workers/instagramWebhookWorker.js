const { Worker, UnrecoverableError } = require('bullmq');
const { redis, redisConfig } = require('../config/redis');
const logger = require('../utils/logger');
const { IG_WEBHOOK_QUEUE_NAME, enqueueInstagramWebhook } = require('../queues/instagramQueue');
const InstagramWebhookEvent = require('../models/InstagramWebhookEvent');
const InstagramActionLog = require('../models/InstagramActionLog');
const InstagramService = require('../services/instagramService');
const AIService = require('../services/aiService');
const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');
const { emitToUser, emitNotification } = require('../utils/socket');
const rateLimitService = require('../services/rateLimitService');
const creditHelper = require('../utils/creditHelper');
const { generateSpeech, deleteTempAudio, transcribeAudio, convertAudioToVideo } = require('../utils/audioHelper');
const CloudinaryService = require('../services/cloudinaryService');
const os = require('os');
const path = require('path');
const { checkKeywordMatch } = require('../utils/keywordMatcher');

const ACQUIRE_LOCK_SCRIPT = `
  if redis.call("SET", KEYS[1], ARGV[1], "NX", "EX", ARGV[2]) then
    return 1
  else
    return 0
  end
`;
const RELEASE_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

async function withLock(lockKey, lockTimeoutSec, fn) {
  const token = Math.random().toString(36).substring(2);
  let acquired = false;
  
  for (let i = 0; i < 3; i++) {
    acquired = await redis.eval(ACQUIRE_LOCK_SCRIPT, 1, lockKey, token, lockTimeoutSec);
    if (acquired) break;
    await new Promise(res => setTimeout(res, 1000));
  }
  
  if (!acquired) {
    throw new Error(`LOCK_ACQUIRE_FAILED: Could not acquire lock for ${lockKey}`);
  }
  
  try {
    return await fn();
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    } catch (e) {
      logger.error(`Error releasing lock ${lockKey}: ${e.message}`);
    }
  }
}

async function executeActionIdempotent(actionId, webhookEventId, igAccountId, actionType, recipientId, payload, actionFn) {
  try {
    const existingAction = await InstagramActionLog.findOne({ actionId });
    if (existingAction) {
      if (existingAction.status === 'success') {
        logger.info(`[Idempotency] Action ${actionId} already completed. Skipping.`);
        return existingAction.response;
      }
      if (existingAction.status === 'pending') {
         // If it's been pending for more than 5 minutes, assume a crash occurred and retry
         const ageMs = Date.now() - new Date(existingAction.createdAt).getTime();
         if (ageMs > 5 * 60 * 1000) {
            logger.warn(`[Idempotency] Action ${actionId} was stuck pending for >5m. Overwriting and retrying to prevent permanent stall.`);
         } else {
            throw new Error(`Action ${actionId} is already pending. Will retry later.`);
         }
      }
    }

    const actionLog = await InstagramActionLog.findOneAndUpdate(
      { actionId },
      {
        $set: {
          webhookEventId,
          instagramAccountId: igAccountId,
          actionType,
          recipientId,
          payload,
          status: 'pending',
          createdAt: new Date() // Reset timestamp if overwriting
        }
      },
      { upsert: true, new: true }
    );

    const response = await actionFn();

    actionLog.status = 'success';
    actionLog.response = response;
    actionLog.completedAt = new Date();
    await actionLog.save();

    return response;
  } catch (err) {
    logger.error(`Error executing idempotent action ${actionId}: ${err.message}`);
    await InstagramActionLog.updateOne({ actionId }, { $set: { status: 'failed', response: { error: err.message } } });
    
    // Non-retryable Meta Errors
    if (err.message.includes('code 400') || err.message.includes('code 401') || err.message.includes('code 403') || err.message.includes('invalid_token')) {
       throw new UnrecoverableError(`Permanent Instagram API Error: ${err.message}`);
    }
    throw err;
  }
}

async function handleInstagramDM(event, igAccount, agent) {
  const payload = event.payload;
  const senderId = event.senderId;
  const messageId = event.messageId;
  const replyToMessageId = payload?.message?.reply_to?.mid || null;
  let text = payload?.message?.text;
  const attachments = payload?.message?.attachments;

  let audioUrl = null;
  if (attachments && attachments.length > 0) {
    const audioAttachment = attachments.find(a => a.type === 'audio' || a.type === 'voice');
    if (audioAttachment) audioUrl = audioAttachment.payload?.url;
  }

  logger.info(`[Worker] Processing IG DM from ${senderId}`);

  if (!senderId || !messageId || (!text && !audioUrl)) return;

  if (senderId === igAccount.igAccountId) {
    logger.info(`Ignored self-DM by the connected account.`);
    return;
  }

  let conversation = await Conversation.findOne({
    organization: igAccount.organization,
    platform: 'instagram',
    customerIgId: senderId,
  }).sort({ createdAt: -1 });

  const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);

  if (!conversation) {
    const profile = await igService.getCustomerProfile(senderId);
    const customerName = profile?.name || profile?.username || '';
    
    conversation = await Conversation.create({
      user: igAccount.user,
      organization: igAccount.organization,
      agent: agent ? agent._id : null,
      instagramAccount: igAccount._id,
      platform: 'instagram',
      customerIgId: senderId,
      customerName: customerName,
      customerUsername: profile?.username || '',
      status: 'active',
      lastMessageAt: event.providerTimestamp || new Date(),
    });
  } else {
    if (conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.addMessage({
        role: 'system',
        content: 'System: Conversation session was reset/reopened.',
        timestamp: event.providerTimestamp || new Date(),
      });
    }
  }

  await rateLimitService.recordWebhook(igAccount.user, 'instagram');

  let userMessageText = text;
  let isAudioRequest = false;

  if (audioUrl) {
    try {
      const tempAudioPath = path.join(os.tmpdir(), `incoming_ig_${messageId}.ogg`);
      await igService.downloadMedia(audioUrl, tempAudioPath);
      userMessageText = await transcribeAudio(tempAudioPath);
      await deleteTempAudio(tempAudioPath);
      isAudioRequest = true;
      text = userMessageText; 
    } catch (sttError) {
      logger.error(`Failed to transcribe incoming IG audio: ${sttError.message}`);
      await executeActionIdempotent(
        `ig_action_err_${event._id}`, event._id, igAccount._id, 'send_text', senderId, {},
        () => igService.sendTextMessage(igAccount.igAccountId, senderId, "Sorry, I couldn't properly hear your audio message. Could you please send it as text?")
      );
      return;
    }
  }

  if (conversation.status === 'human_handoff') {
    await conversation.addMessage({
      role: 'user',
      content: isAudioRequest ? userMessageText : (text || '[Audio Message]'),
      waMessageId: messageId,
      replyToMessageId: replyToMessageId,
      type: isAudioRequest ? 'audio' : 'text',
      media: isAudioRequest ? { url: audioUrl } : undefined,
      timestamp: event.providerTimestamp || new Date(),
    });
    conversation.lastMessageAt = event.providerTimestamp || new Date();
    conversation.isRead = false;
    await conversation.save();
    return;
  }

  if (agent && AIService.shouldHandoffToHuman(text, agent.humanHandoffKeywords)) {
    conversation.status = 'human_handoff';
    await conversation.addMessage({
      role: 'user',
      content: text || '[Audio Message]',
      waMessageId: messageId,
      replyToMessageId: replyToMessageId,
      type: 'text',
      timestamp: event.providerTimestamp || new Date(),
    });
    await conversation.addMessage({
      role: 'system',
      content: 'System: 🔴 HUMAN HANDOFF REQUESTED. Email notification sent to admin.',
      timestamp: new Date(),
    });
    conversation.lastMessageAt = event.providerTimestamp || new Date();
    conversation.isRead = false;
    await conversation.save();
    
    await executeActionIdempotent(
      `ig_action_handoff_${event._id}`, event._id, igAccount._id, 'send_text', senderId, {},
      () => igService.sendTextMessage(igAccount.igAccountId, senderId, agent.humanHandoffMessage)
    );
    return;
  }

  const loopKey = `bot_loop_ig:${conversation._id}`;
  const msgCount = await redis.incr(loopKey);
  if (msgCount === 1) await redis.expire(loopKey, 60);
  
  if (msgCount > 10) {
    if (conversation.status !== 'human_handoff') {
      conversation.status = 'human_handoff';
      await conversation.addMessage({
        role: 'system',
        content: 'System: 🔴 AUTOMATIC BOT LOOP DETECTED. Rate limit exceeded (>10 messages per minute). AI Agent has been paused for safety.',
        timestamp: new Date(),
      });
      await conversation.save();
    }
    return;
  }

  await conversation.addMessage({
    role: 'user',
    content: text || '[Audio Message]',
    waMessageId: messageId,
    replyToMessageId: replyToMessageId,
    type: 'text',
    timestamp: event.providerTimestamp || new Date(),
  });
  conversation.lastMessageAt = event.providerTimestamp || new Date();
  conversation.isRead = false;
  await conversation.save();

  // P0 Fix: Batching Coalescing Check. If there are newer events waiting in the DB, skip AI generation now.
  const newerEvent = await InstagramWebhookEvent.findOne({
    instagramAccountId: igAccount._id,
    senderId,
    status: { $in: ['queued', 'processing', 'received'] },
    providerTimestamp: { $gt: event.providerTimestamp }
  });

  if (newerEvent) {
    logger.info(`[Worker] Found newer pending event for ${senderId}. Skipping AI generation for event ${event._id} to allow batching.`);
    return; 
  }

  if (!igAccount.messengerBotEnabled) return;

  const isAllowed = await rateLimitService.checkAndRecordApiCall(igAccount.user, 'instagram');
  if (!isAllowed) {
    await conversation.addMessage({ role: 'system', content: 'System: 🔴 Message limit exceeded.', timestamp: new Date() });
    return;
  }

  const wantsVoice = isVoiceRequest(text) || isAudioRequest;

  await executeActionIdempotent(`ig_action_typingon_${event._id}`, event._id, igAccount._id, 'typing_on', senderId, {},
    () => igService.sendAction(igAccount.igAccountId, senderId, 'typing_on')
  );

  const matchedTrigger = await checkKeywordMatch(igAccount.organization, text, 'instagram', 'DM', agent?._id);
  if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
    let sentMsg;
    const shouldQuote = Math.random() > 0.5;
    const targetMessageId = shouldQuote ? messageId : null;
    
    sentMsg = await executeActionIdempotent(`ig_action_kw_${event._id}`, event._id, igAccount._id, 'send_keyword', senderId, {}, async () => {
      let msg;
      if (matchedTrigger.mediaType === 'image' && matchedTrigger.mediaUrl) {
        msg = await igService.sendImageMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
      } else if (matchedTrigger.mediaType === 'video' && matchedTrigger.mediaUrl) {
        msg = await igService.sendVideoMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
      } else if (matchedTrigger.mediaType === 'audio' && matchedTrigger.mediaUrl) {
        msg = await igService.sendAudioMessage(igAccount.igAccountId, senderId, matchedTrigger.mediaUrl);
      } else {
        msg = await igService.sendTextMessage(igAccount.igAccountId, senderId, matchedTrigger.response, targetMessageId);
      }
      if (matchedTrigger.mediaType !== 'none' && matchedTrigger.response) {
        await igService.sendTextMessage(igAccount.igAccountId, senderId, matchedTrigger.response, targetMessageId);
      }
      return msg;
    });

    await conversation.addMessage({
      role: 'assistant',
      content: matchedTrigger.response || '[Media Sent]',
      waMessageId: sentMsg?.message_id || sentMsg?.id || messageId,
      replyToMessageId: targetMessageId,
      type: matchedTrigger.mediaType !== 'none' ? matchedTrigger.mediaType : 'text',
      media: matchedTrigger.mediaUrl ? { url: matchedTrigger.mediaUrl } : null,
      status: 'sent',
      timestamp: new Date()
    });

    conversation.totalMessages += 2;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    
    await executeActionIdempotent(`ig_action_typingoff_${event._id}`, event._id, igAccount._id, 'typing_off', senderId, {},
      () => igService.sendAction(igAccount.igAccountId, senderId, 'typing_off')
    );
    return; 
  }

  const contextWindow = agent ? agent.contextWindow : 10;
  const contextMessages = (await conversation.getRecentMessages(20))
    .filter((m) => m.role !== 'system')
    .slice(-(contextWindow * 2))
    .map((m) => ({ role: m.role, content: m.content }));
    
  const currentText = contextMessages.length > 0 ? contextMessages[contextMessages.length - 1].content : '';

  const tempAgent = agent || {
      _id: `ig_dm_${igAccount._id}`,
      systemPrompt: igAccount.messengerBotPrompt || "You are a helpful assistant. Reply to this Instagram message in a friendly way. Keep it short.",
      temperature: 0.7,
      contextWindow: 10,
      aiProvider: 'openai',
      model: 'gpt-4o-mini'
  };

  const aiResult = await AIService.generate(tempAgent, contextMessages.slice(0, -1), currentText, 'instagram');
  if (!aiResult || !aiResult.content) return;

  const cleanReply = AIService.sanitizeForPlatform(aiResult.content, 'instagram');
  if (cleanReply.toLowerCase().includes('experiencing some technical difficulties') || cleanReply.toLowerCase().includes('currently unable to process')) return;

  let sentMsg;
  let audioSent = false;
  const audioSetting = await SystemSetting.findOne({ key: 'instagram_audio_enabled' });
  const instagramAudioEnabled = audioSetting ? audioSetting.value : true;

  if (wantsVoice && instagramAudioEnabled) {
    try {
      const localAudioPath = await generateSpeech(cleanReply, agent.language || 'en-US');
      const tempVideoPath = localAudioPath.replace('.mp3', '.mp4');
      await convertAudioToVideo(localAudioPath, tempVideoPath);
      const uploadResult = await CloudinaryService.upload(tempVideoPath, { resource_type: 'video', folder: 'instagram_tts' });

      sentMsg = await executeActionIdempotent(`ig_action_voice_${event._id}`, event._id, igAccount._id, 'send_voice', senderId, {},
        () => igService.sendVideoMessage(igAccount.igAccountId, senderId, uploadResult.url)
      );
      audioSent = true;

      await deleteTempAudio(localAudioPath);
      await deleteTempAudio(tempVideoPath);
    } catch (audioError) {
      logger.error(`Error in IG TTS flow: ${audioError.message}`);
    }
  }

  if (!wantsVoice || !audioSent || !instagramAudioEnabled) {
    const shouldQuote = Math.random() > 0.5;
    sentMsg = await executeActionIdempotent(`ig_action_reply_${event._id}`, event._id, igAccount._id, 'send_reply', senderId, {},
      () => igService.sendTextMessage(igAccount.igAccountId, senderId, cleanReply || "I am currently unable to process that request.", shouldQuote ? messageId : null)
    );
  }

  await conversation.addMessage({
    role: 'assistant',
    content: cleanReply,
    waMessageId: sentMsg?.message_id || sentMsg?.id || messageId,
    replyToMessageId: null,
    type: 'text',
    status: 'sent',
    tokens: aiResult.tokensUsed,
    responseTime: aiResult.responseTime,
    timestamp: new Date()
  });

  conversation.totalMessages += 2;
  conversation.totalTokensUsed += aiResult.tokensUsed;
  conversation.lastMessageAt = new Date();
  await conversation.save();
}

async function handleInstagramComment(event, igAccount, agent) {
  const payload = event.payload;
  const commentId = event.commentId;
  const text = payload.text;
  const commenterId = event.senderId;

  if (!text || !commentId) return;
  if (commenterId === igAccount.igAccountId) return;

  let mediaId = payload?.media?.id;
  const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);
  
  if (!mediaId && commentId) {
    const commentDetails = await igService.getCommentDetails(commentId);
    if (commentDetails && commentDetails.media) mediaId = commentDetails.media.id;
  }

  if (mediaId) {
    const PostAIToggle = require('../models/PostAIToggle');
    const aiToggle = await PostAIToggle.findOne({ platform: 'instagram', accountId: igAccount._id, mediaId: mediaId });
    if (aiToggle && aiToggle.isAiEnabled === false) return;

    const PostAutomation = require('../models/PostAutomation');
    const postAutomation = await PostAutomation.findOne({ platform: 'instagram', accountId: igAccount._id, mediaId: mediaId, isActive: true });

    if (postAutomation) {
      let matches = false;
      if (postAutomation.triggerType === 'ALL_COMMENTS') {
        matches = true;
      } else if (postAutomation.triggerType === 'KEYWORD' && postAutomation.keywords && postAutomation.keywords.length > 0) {
        const lowerText = text.toLowerCase().trim();
        matches = postAutomation.keywords.some(kw => lowerText.includes(kw.toLowerCase().trim()));
      }

      if (matches) {
        if (postAutomation.dmMessage) {
          await executeActionIdempotent(`ig_action_pdm_${event._id}`, event._id, igAccount._id, 'private_reply', commenterId, {},
            () => igService.sendPrivateReply(commentId, postAutomation.dmMessage)
          );
        }
        if (postAutomation.commentReply) {
          await executeActionIdempotent(`ig_action_preply_${event._id}`, event._id, igAccount._id, 'reply_comment', commenterId, {},
            () => igService.replyToComment(igAccount.igAccountId, commentId, postAutomation.commentReply)
          );
        }
      }
      return; 
    }
  }

  if (!igAccount.commentBotEnabled) return;

  const matchedTrigger = await checkKeywordMatch(igAccount.organization, text, 'instagram', 'COMMENT', agent?._id);
  if (matchedTrigger && matchedTrigger.action === 'SEND_MESSAGE') {
      await executeActionIdempotent(`ig_action_kwreply_${event._id}`, event._id, igAccount._id, 'reply_comment', commenterId, {},
          () => igService.replyToComment(igAccount.igAccountId, commentId, matchedTrigger.response)
      );
      return; 
  }

  const systemPrompt = igAccount.commentBotPrompt || agent?.systemPrompt;
  const fullPrompt = (systemPrompt || "Reply to this Instagram comment.") + "\n\nRules: Keep it short, friendly, and under 2 sentences. Use emojis if appropriate.";

  const tempAgent = { 
    _id: `ig_comment_${igAccount._id}`,
    systemPrompt: fullPrompt,
    temperature: 0.7,
    contextWindow: 1
  };
  
  const aiResult = await AIService.generate(tempAgent, [], text);
  if (!aiResult || !aiResult.content) return;
  if (aiResult.content.toLowerCase().includes('experiencing some technical difficulties')) return;

  await executeActionIdempotent(`ig_action_aireply_${event._id}`, event._id, igAccount._id, 'reply_comment', commenterId, {},
      () => igService.replyToComment(igAccount.igAccountId, commentId, aiResult.content)
  );
}

async function handleInstagramMessageEdit(event, igAccount, agent) {
  const payload = event.payload;
  const editedMid = payload?.message_edit?.mid;
  const igService = new InstagramService(igAccount.pageAccessToken, igAccount.pageId);

  if (!editedMid) return;

  const messageMeta = await igService.resolveMessageSender(editedMid);
  const text = messageMeta?.message;
  const attachments = messageMeta?.attachments?.data;
  const metaSenderId = messageMeta?.from?.id;

  if ((!text && !attachments) || !metaSenderId) return;
  if (metaSenderId === igAccount.igAccountId) return;

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

  const simulatedEvent = {
    ...event.toObject(),
    payload: {
      sender: { id: metaSenderId },
      message: {
        mid: editedMid,
        text: text,
        is_echo: false,
        attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined
      }
    },
    senderId: metaSenderId,
    messageId: editedMid
  };

  await handleInstagramDM(simulatedEvent, igAccount, agent);
}

function isVoiceRequest(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('send voice') || lower.includes('voice message') || lower.includes('send audio') || lower.includes('voice note');
}

async function processWebhookEvent(event) {
    const igAccount = event.instagramAccountId;
    const agent = await Agent.findOne({ instagramAccount: igAccount._id, isActive: true });
    
    if (event.eventType === 'message') {
        await handleInstagramDM(event, igAccount, agent);
    } else if (event.eventType === 'message_edit') {
        await handleInstagramMessageEdit(event, igAccount, agent);
    } else if (event.eventType === 'comment') {
        await handleInstagramComment(event, igAccount, agent);
    } else {
        logger.warn(`[InstagramWorker] Unknown event type: ${event.eventType}`);
    }
}

const instagramWebhookWorker = new Worker(IG_WEBHOOK_QUEUE_NAME, async (job) => {
  const { webhookEventId, instagramAccountId } = job.data;
  logger.info(`[InstagramWorker] Triggered by job ${job.id} for event ${webhookEventId}`);

  let triggerEvent;
  try {
    triggerEvent = await InstagramWebhookEvent.findById(webhookEventId);
    if (!triggerEvent) {
      throw new Error(`Webhook event ${webhookEventId} not found in DB`);
    }

    if (triggerEvent.status === 'processed') {
      logger.info(`[InstagramWorker] Event ${webhookEventId} already processed by a previous batch. Skipping.`);
      return;
    }

    const senderId = triggerEvent.senderId || triggerEvent.commentId || 'global';
    const lockKey = `ig:conversation:lock:${instagramAccountId}:${senderId}`;
    
    // Lock TTL to 300s (5 minutes) to safely handle long AI generation and OpenRouter fallbacks
    await withLock(lockKey, 300, async () => {
      
      // P0 Fix: Find ALL pending events for this sender to process sequentially in strict FIFO order
      const pendingEvents = await InstagramWebhookEvent.find({
        instagramAccountId,
        senderId: triggerEvent.senderId, // Matches either the DM sender or the commenter
        status: { $in: ['queued', 'processing', 'retrying'] }
      }).sort({ providerTimestamp: 1 }).populate({ path: 'instagramAccountId', select: '+pageAccessToken' });
      
      if (pendingEvents.length === 0) return;

      for (const event of pendingEvents) {
        try {
          event.status = 'processing';
          event.processingStartedAt = new Date();
          event.attempts += 1;
          await event.save();

          await processWebhookEvent(event);

          event.status = 'processed';
          event.processedAt = new Date();
          await event.save();
          logger.info(`[InstagramWorker] Event ${event._id} processed successfully in batch.`);
        } catch (eventErr) {
          logger.error(`[InstagramWorker] Failed processing event ${event._id} in batch: ${eventErr.message}`);
          event.status = 'retrying';
          event.lastError = eventErr.message;
          await event.save();
          throw eventErr; // Rethrow to let BullMQ handle retry for this batch
        }
      }
    });

  } catch (err) {
    if (err.message.includes('LOCK_ACQUIRE_FAILED')) {
       logger.warn(`[InstagramWorker] Lock failed for sender, throwing to retry backoff.`);
       throw err; 
    }
    logger.error(`[InstagramWorker] Job ${job.id} failed: ${err.message}`, err);
    throw err;
  }
}, {
  connection: redis,
  concurrency: 10,
});

instagramWebhookWorker.on('failed', async (job, err) => {
  logger.error(`[InstagramWorker] Job ${job.id} completely failed after retries: ${err.message}`);
  try {
     const { webhookEventId } = job.data;
     await InstagramWebhookEvent.findByIdAndUpdate(webhookEventId, {
        status: 'failed',
        failedAt: new Date(),
        lastError: err.message
     });
  } catch (dbErr) {
     logger.error(`[InstagramWorker] Failed to update event status to failed: ${dbErr.message}`);
  }
});

// P0 Fix: Sweeper Cron to rescue stalled events that failed to enqueue or got stuck in processing
setInterval(async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    // Find events stuck in queued (failed to hit BullMQ) or processing (worker crashed)
    const stalledEvents = await InstagramWebhookEvent.find({
      status: { $in: ['queued', 'processing'] },
      $or: [
        { processingStartedAt: { $lte: tenMinutesAgo } },
        { receivedAt: { $lte: tenMinutesAgo }, processingStartedAt: null }
      ]
    }).limit(50);
    
    for (const event of stalledEvents) {
      logger.warn(`[InstagramWorker] Sweeping stalled event ${event._id}. Enqueuing to BullMQ.`);
      await enqueueInstagramWebhook(event._id, {
        organizationId: event.organizationId,
        instagramAccountId: event.instagramAccountId,
      });
      // Just mark it retrying so sweeper doesn't pick it up again immediately
      event.status = 'retrying';
      await event.save();
    }
  } catch (err) {
    logger.error(`[InstagramWorker] Sweeper cron failed: ${err.message}`);
  }
}, 5 * 60 * 1000);

module.exports = {
  instagramWebhookWorker,
  processWebhookEvent
};
