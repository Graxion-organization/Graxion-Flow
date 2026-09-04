const InstagramAccount = require('../models/InstagramAccount');
const Organization = require('../models/Organization');
const InstagramWebhookEvent = require('../models/InstagramWebhookEvent');
const { enqueueInstagramWebhook } = require('../queues/instagramQueue');
const logger = require('../utils/logger');
const { redis } = require('../config/redis');

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
      const isNew = await redis.set(`ig_dedup_${eventId}`, '1', 'EX', 3600, 'NX');
      if (!isNew) {
        logger.info(`[Webhook Controller] Duplicate event ${eventId} dropped by Redis lock.`);
        return;
      }
    } catch (redisErr) {
      logger.warn(`[Webhook Controller] Redis dedup failed for ${eventId}, falling back to DB unique index: ${redisErr.message}`);
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
      logger.info(`[Webhook Controller] Event ${eventId} is already processed or processing in DB. Skipping duplicate.`);
      return;
    }

    if (eventType === 'comment') {
      // Direct server processing without BullMQ for comments
      const { processWebhookEvent } = require('../workers/instagramWebhookWorker');
      
      event.status = 'processing';
      event.processingStartedAt = new Date();
      await event.save();

      // Fire and forget (don't block the webhook response)
      // Attach the populated igAccount to the event so the worker doesn't need to fetch it
      event.instagramAccountId = igAccount; 

      processWebhookEvent(event)
        .then(async () => {
          event.status = 'processed';
          event.processedAt = new Date();
          await event.save();
          logger.info(`[Inline Processing] Comment event ${eventId} processed successfully without Redis.`);
        })
        .catch(async (err) => {
          logger.error(`[Inline Processing] Comment event ${eventId} failed: ${err.message}`);
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
    } catch (enqueueErr) {
      logger.error(`[Webhook Controller] BullMQ enqueue failed for ${eventId}: ${enqueueErr.message}`);
      // Atomicity fallback: The sweeper cron will pick this up later since status is 'queued'
    }
    
  } catch (err) {
    logger.error(`[Webhook Controller] Failed to persist event ${eventId}: ${err.message}`);
    throw err;
  }
}

exports.receiveMessage = async (req, res) => {
  logger.info(`>>> INSTAGRAM WEBHOOK ENDPOINT HIT: ${req.method} ${req.originalUrl}`);

  let successCount = 0;

  try {
    const { body } = req;

    if (body.object !== 'instagram') {
      return res.status(200).send('EVENT_RECEIVED'); // Not for us, but ack it
    }

    for (const entry of body.entry) {
      const igAccountId = entry.id;
      const changes = entry.changes;
      const messaging = entry.messaging;

      if (igAccountId === '0') continue;

      const igAccount = await InstagramAccount.findOne({
        igAccountId,
        status: 'connected',
        isActive: true,
      }).select('+pageAccessToken');

      if (!igAccount) continue;

      const org = await Organization.findOne({ _id: igAccount.organization, isActive: true });
      if (!org) continue;

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

    // Only acknowledge IF we durably saved everything without DB crash
    return res.status(200).send('EVENT_RECEIVED');

  } catch (err) {
    logger.error(`Instagram Webhook parsing error: ${err.message}`);
    // If we haven't successfully processed anything and there's a DB failure, we return 500 to force a Meta retry.
    // If it's just a payload parsing error, we shouldn't force retry.
    if (successCount === 0 && (err.name === 'MongoError' || err.name === 'MongooseError' || err.message.includes('Mongo'))) {
      return res.status(500).send('DB_ERROR');
    }
    return res.status(200).send('EVENT_RECEIVED_WITH_ERRORS');
  }
};
