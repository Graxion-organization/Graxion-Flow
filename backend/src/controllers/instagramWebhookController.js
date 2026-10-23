const InstagramAccount = require('../models/InstagramAccount');
const Organization = require('../models/Organization');
const InstagramWebhookEvent = require('../models/InstagramWebhookEvent');
const { enqueueInstagramWebhook } = require('../queues/instagramQueue');
const logger = require('../utils/logger');
const { redis } = require('../config/redis');

// GET - Meta Webhook Verification
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'] || req.query['hub_mode'];
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      logger.info('[INSTAGRAM_WEBHOOK_VERIFIED] Instagram Webhook challenge verified successfully');
      return res.status(200).send(challenge);
    }
    logger.warn('[INSTAGRAM_WEBHOOK_VERIFY_FAILED] Instagram verification token mismatch');
    return res.status(403).send('Verification failed');
  }
  res.status(400).send('Bad request');
};

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

async function persistAndEnqueueEvent(igAccount, eventType, eventId, senderId, payload, extras = {}) {
  try {
    try {
      const { isRedisReady } = require('../config/redis');
      if (isRedisReady() && typeof redis.set === 'function') {
        const isNew = await redis.set(`ig_dedup_${eventId}`, '1', 'EX', 3600, 'NX');
        if (!isNew) {
          logger.info(`[DEDUPLICATION_MEMORY_HIT] Duplicate Instagram event ${eventId} dropped by Redis lock.`);
          return;
        }
      }
    } catch (redisErr) {
      logger.warn(`[Webhook Controller] Redis dedup skipped/failed for ${eventId}: ${redisErr.message}`);
    }

    const event = await InstagramWebhookEvent.findOneAndUpdate(
      { provider: 'instagram', eventId },
      {
        $setOnInsert: {
          eventType,
          organizationId: igAccount.organization,
          instagramAccountId: igAccount._id,
          senderId,
          payload,
          providerTimestamp: new Date(payload.timestamp || Date.now()),
          status: 'queued',
          ...extras
        }
      },
      { upsert: true, new: true }
    );

    if (event.status !== 'queued' && event.status !== 'received') {
      logger.info(`[DEDUPLICATION_DB_HIT] Event ${eventId} already processed/processing in DB. Skipping duplicate.`);
      return;
    }

    if (eventType === 'comment') {
      // Direct server processing without BullMQ for comments
      const { processWebhookEvent } = require('../workers/instagramWebhookWorker');
      
      event.status = 'processing';
      event.processingStartedAt = new Date();
      await event.save();

      event.instagramAccountId = igAccount; 

      processWebhookEvent(event)
        .then(async () => {
          event.status = 'processed';
          event.processedAt = new Date();
          await event.save();
          logger.info(`[INSTAGRAM_INLINE_SUCCESS] Comment event ${eventId} processed successfully.`);
        })
        .catch(async (err) => {
          logger.error(`[INSTAGRAM_INLINE_FAILED] Comment event ${eventId} failed: ${err.message}`);
          event.status = 'failed';
          event.lastError = err.message;
          event.failedAt = new Date();
          await event.save();
        });
      
      return;
    }

    try {
      await enqueueInstagramWebhook(event._id, {
        organizationId: igAccount.organization,
        instagramAccountId: igAccount._id,
      });
      logger.info(`[BULLMQ_ENQUEUED] Enqueued Instagram event ${eventId} to BullMQ queue`);
    } catch (enqueueErr) {
      logger.warn(`[BULLMQ_ENQUEUE_FALLBACK] BullMQ enqueue failed for ${eventId} (${enqueueErr.message}). Processing inline immediately.`);
      setImmediate(async () => {
        try {
          const { processWebhookEvent } = require('../workers/instagramWebhookWorker');
          await processWebhookEvent(event);
          event.status = 'processed';
          event.processedAt = new Date();
          await event.save();
          logger.info(`[INSTAGRAM_INLINE_FALLBACK_SUCCESS] Event ${eventId} processed successfully inline.`);
        } catch (procErr) {
          logger.error(`[INSTAGRAM_INLINE_FALLBACK_FAILED] Event ${eventId} failed: ${procErr.message}`);
        }
      });
    }
    
  } catch (err) {
    logger.error(`[INSTAGRAM_PERSIST_ERROR] Failed to persist event ${eventId}: ${err.message}`);
    throw err;
  }
}

// Process raw webhook payload (called by receiveMessage and BullMQ worker)
exports.processWebhookPayload = async (body) => {
  if (!body || body.object !== 'instagram' || !Array.isArray(body.entry)) {
    logger.info('[INSTAGRAM_WEBHOOK_IGNORED] Non-Instagram payload object', { object: body?.object });
    return;
  }

  let successCount = 0;

  for (const entry of body.entry) {
    const igAccountId = entry.id;
    const changes = entry.changes;
    const messaging = entry.messaging;

    if (!igAccountId || igAccountId === '0') continue;

    // Match by igAccountId OR connected Facebook Page ID
    let igAccount = await InstagramAccount.findOne({
      $or: [{ igAccountId }, { pageId: igAccountId }],
      status: 'connected',
      isActive: true,
    }).select('+pageAccessToken');

    if (!igAccount) {
      igAccount = await InstagramAccount.findOne({
        $or: [{ igAccountId }, { pageId: igAccountId }],
      }).select('+pageAccessToken');
    }

    if (!igAccount) {
      igAccount = await InstagramAccount.findOne({ isActive: true }).select('+pageAccessToken');
      if (igAccount) {
        logger.info(`[ACCOUNT_MATCHED_FALLBACK] Matched active Instagram account ${igAccount.igAccountId} for entry ${igAccountId}`);
      }
    }

    if (!igAccount) {
      logger.warn(`[ACCOUNT_NOT_FOUND] No active Instagram account for ID: ${igAccountId}`);
      continue;
    }

    logger.info('[ACCOUNT_MATCHED] Instagram account matched', {
      accountId: igAccount._id,
      igAccountId: igAccount.igAccountId,
      pageId: igAccount.pageId,
      organizationId: igAccount.organization,
    });

    const org = await Organization.findOne({ _id: igAccount.organization, isActive: true });
    if (!org) {
      logger.warn(`[ORGANIZATION_INACTIVE] Organization ${igAccount.organization} inactive. Skipping.`);
      continue;
    }

    if (messaging) {
      for (const event of messaging) {
        if (event.message && !event.message.is_echo) {
          const messageId = event.message.mid;
          const senderId = event.sender?.id;
          if (messageId && senderId) {
            await persistAndEnqueueEvent(igAccount, 'message', `ig_msg_${messageId}`, senderId, event, { messageId });
            successCount++;
          }
        } else if (event.message_edit) {
          const messageId = event.message_edit.mid;
          const senderId = event.sender?.id || "unknown"; 
          if (messageId) {
            await persistAndEnqueueEvent(igAccount, 'message_edit', `ig_edit_${messageId}_${event.message_edit.num_edit || 0}`, senderId, event, { messageId });
            successCount++;
          }
        }
      }
    }

    if (changes) {
      for (const change of changes) {
        if (change.field === 'comments' && change.value) {
          const commentId = change.value.id;
          const commenterId = change.value.from?.id;
          if (commentId && commenterId) {
            await persistAndEnqueueEvent(igAccount, 'comment', `ig_cmt_${commentId}`, commenterId, change.value, { commentId });
            successCount++;
          }
        } else if (change.field === 'messages' && change.value) {
          const dmEvent = normalizeInstagramChangeMessage(change.value);
          if (dmEvent && !dmEvent.message.is_echo) {
            const messageId = dmEvent.message.mid;
            const senderId = dmEvent.sender.id;
            if (messageId && senderId) {
              await persistAndEnqueueEvent(igAccount, 'message', `ig_msg_${messageId}`, senderId, dmEvent, { messageId });
              successCount++;
            }
          }
        }
      }
    }
  }

  return successCount;
};

// POST - Receive incoming Instagram Webhooks
exports.receiveMessage = async (req, res) => {
  logger.info(`[INSTAGRAM_WEBHOOK_RECEIVED] Incoming Instagram webhook: ${req.method} ${req.originalUrl}`);

  try {
    await exports.processWebhookPayload(req.body);
    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    logger.error(`[INSTAGRAM_WEBHOOK_ERROR] Instagram webhook processing error: ${err.message}`, { stack: err.stack });
    if (err.name === 'MongoError' || err.name === 'MongooseError' || err.message.includes('Mongo')) {
      return res.status(500).send('DB_ERROR');
    }
    return res.status(200).send('EVENT_RECEIVED_WITH_ERRORS');
  }
};
