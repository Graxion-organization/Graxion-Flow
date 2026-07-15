const { Queue, Worker } = require('bullmq');
const { redis, redisConfig } = require('../config/redis');
const logger = require('../utils/logger');
const WebhookLog = require('../models/WebhookLog');

const WEBHOOK_QUEUE_NAME = 'webhook-events';

const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConfig,
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

/**
 * We export a function that controllers can use to enqueue jobs.
 * Instead of storing the function (which BullMQ can't serialize), 
 * we store the platform, event data, and metadata.
 */
const enqueueWebhook = async (platform, eventType, payload) => {
  try {
    await webhookQueue.add(`${platform}-${eventType}`, {
      platform,
      eventType,
      payload
    }, {
      jobId: `${platform}-${payload?.entry?.[0]?.id}-${Date.now()}` // Basic deduplication
    });

    // Also log to DB (DB-011)
    await WebhookLog.create({
      platform,
      eventType,
      payload,
      status: 'PENDING'
    });

  } catch (err) {
    logger.error(`[BullMQ] Failed to enqueue webhook: ${err.message}`);
  }
};

// Initialize the worker that actually processes the webhooks
// Note: In a real cluster, you would split the Worker into a separate process file.
const webhookWorker = new Worker(WEBHOOK_QUEUE_NAME, async (job) => {
  const { platform, eventType, payload } = job.data;
  logger.info(`[BullMQ] Processing webhook for ${platform} (${eventType})`);

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
  connection: redisConfig,
  concurrency: 5 // Process 5 webhooks concurrently
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`[BullMQ] Job ${job.id} failed: ${err.message}`);
});

module.exports = {
  webhookQueue,
  enqueueWebhook
};
