const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');
const logger = require('../utils/logger');
const InstagramWebhookEvent = require('../models/InstagramWebhookEvent');

const IG_WEBHOOK_QUEUE_NAME = 'instagram-webhooks';

const instagramWebhookQueue = new Queue(IG_WEBHOOK_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // we keep track of completion in MongoDB
    removeOnFail: 100, // keep the last 100 failed jobs for debugging in Redis, but we also save them in MongoDB
  }
});

const enqueueInstagramWebhook = async (webhookEventId, metadata) => {
  try {
    await instagramWebhookQueue.add(
      `ig-webhook-${webhookEventId}`,
      {
        webhookEventId,
        organizationId: metadata.organizationId,
        instagramAccountId: metadata.instagramAccountId,
      },
      {
        jobId: `ig-job-${webhookEventId}`, // prevents duplicate jobs for the same webhookEventId
      }
    );
  } catch (err) {
    logger.error(`[BullMQ] Failed to enqueue Instagram webhook event ${webhookEventId}: ${err.message}`);
    throw err;
  }
};

module.exports = {
  IG_WEBHOOK_QUEUE_NAME,
  instagramWebhookQueue,
  enqueueInstagramWebhook
};
