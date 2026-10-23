const { Queue, Worker } = require('bullmq');
const { redis, redisConfig } = require('../config/redis');
const logger = require('../utils/logger');
const WebhookLog = require('../models/WebhookLog');

const WEBHOOK_QUEUE_NAME = 'webhook-events';

const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  }
});

const { isRedisReady } = require('../config/redis');

/**
 * We export a function that controllers can use to enqueue jobs.
 * If Redis/BullMQ is healthy, it enqueues to BullMQ.
 * If Redis is offline, disconnected, or queue times out, it FALLS BACK IMMEDIATELY
 * to async direct inline processing so that messages and AI replies are NEVER lost!
 */
const enqueueWebhook = async (platform, eventType, payload) => {
  let enqueued = false;

  if (isRedisReady()) {
    try {
      const rawMsgId = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
                       payload?.entry?.[0]?.messaging?.[0]?.message?.mid ||
                       payload?.message?.message_id ||
                       payload?.update_id ||
                       payload?.messageId;
      const deterministicJobId = rawMsgId 
        ? `${platform}-${rawMsgId}` 
        : `${platform}-${payload?.entry?.[0]?.id || 'evt'}-${Date.now()}`;

      const addPromise = webhookQueue.add(`${platform}-${eventType}`, {
        platform,
        eventType,
        payload
      }, {
        jobId: deterministicJobId
      });

      // 2.5s timeout race so a lagging Redis never hangs the response
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('BullMQ queue timeout')), 2500)
      );

      await Promise.race([addPromise, timeoutPromise]);
      enqueued = true;

      // Log to DB (DB-011)
      await WebhookLog.create({
        platform,
        eventType,
        payload,
        status: 'PENDING'
      }).catch(() => {});

    } catch (err) {
      logger.warn(`[BullMQ] Enqueue skipped/failed (${err.message}). Processing inline immediately.`);
    }
  }

  // Fallback to inline processing if queue wasn't used or failed
  if (!enqueued) {
    logger.info(`[Webhook Inline] Processing ${platform} (${eventType}) directly inline`);
    setImmediate(async () => {
      try {
        if (platform === 'whatsapp') {
          const waController = require('../controllers/webhookController');
          await waController.processWebhookPayload(payload);
        } else if (platform === 'instagram') {
          const igController = require('../controllers/instagramWebhookController');
          await igController.processWebhookPayload(payload);
        } else if (platform === 'facebook') {
          const fbController = require('../controllers/facebookWebhookController');
          await fbController.processWebhookPayload(payload);
        } else if (platform === 'telegram') {
          const tgController = require('../controllers/telegramWebhookController');
          await tgController.processWebhookPayload(payload);
        }

        await WebhookLog.create({
          platform,
          eventType,
          payload,
          status: 'PROCESSED'
        }).catch(() => {});
      } catch (inlineErr) {
        logger.error(`[Webhook Inline Error] Failed to process ${platform} webhook: ${inlineErr.message}`);
        await WebhookLog.create({
          platform,
          eventType,
          payload,
          status: 'FAILED',
          error: inlineErr.message
        }).catch(() => {});
      }
    });
  }
};

// Initialize the worker that actually processes the webhooks
// Note: In a real cluster, you would split the Worker into a separate process file.
const webhookWorker = new Worker(WEBHOOK_QUEUE_NAME, async (job) => {
  const { platform, eventType, payload } = job.data;
  logger.info(`[BullMQ] Processing webhook for ${platform} (${eventType})`);
  logger.info(`[Webhook Payload - ${platform}]:\n${JSON.stringify(payload, null, 2)}`);

  try {
    // Import controllers dynamically to avoid circular dependencies
    if (platform === 'whatsapp') {
      const waController = require('../controllers/webhookController');
      await waController.processWebhookPayload(payload);
    } else if (platform === 'instagram') {
      const igController = require('../controllers/instagramWebhookController');
      await igController.processWebhookPayload(payload);
    } else if (platform === 'facebook') {
      const fbController = require('../controllers/facebookWebhookController');
      await fbController.processWebhookPayload(payload);
    } else if (platform === 'telegram') {
      const tgController = require('../controllers/telegramWebhookController');
      await tgController.processWebhookPayload(payload);
    }
    
    // Mark as processed in DB
    await WebhookLog.updateOne(
      { platform, eventType, 'payload.entry': payload.entry },
      { $set: { status: 'PROCESSED', processedAt: new Date() } }
    );

  } catch (err) {
    logger.error(`[BullMQ] Webhook processing failed for ${platform}: ${err.message}`);
    
    await WebhookLog.updateOne(
      { platform, eventType, 'payload.entry': payload.entry },
      { $set: { status: 'FAILED', error: err.message } }
    );
    throw err; // Trigger BullMQ retry
  }
}, { 
  connection: redis,
  concurrency: 5, // Process 5 webhooks concurrently
  stalledInterval: 300000, // Reduced for Upstash limits
  metrics: { maxDataPoints: 0 }
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`[BullMQ] Job ${job.id} failed: ${err.message}`);
});

module.exports = {
  webhookQueue,
  enqueueWebhook
};
