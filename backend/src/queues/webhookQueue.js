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
      const msgIds = [];
      if (Array.isArray(payload?.entry)) {
        for (const entry of payload.entry) {
          for (const change of entry?.changes || []) {
            for (const msg of change?.value?.messages || []) {
              if (msg?.id) msgIds.push(msg.id);
            }
          }
          for (const m of entry?.messaging || []) {
            if (m?.message?.mid) msgIds.push(m.message.mid);
          }
        }
      }
      const rawMsgId =
        (msgIds.length > 0 ? msgIds.join('_') : null) ||
        payload?.message?.message_id ||
        payload?.update_id ||
        payload?.messageId;

      const deterministicJobId = rawMsgId
        ? `${platform}-${rawMsgId}`
        : `${platform}-${payload?.entry?.[0]?.id || 'evt'}-${Date.now()}`;

      // If a previous job with this deterministic ID is stuck in 'failed' state,
      // remove it first so duplicate webhook delivery can re-enqueue and resume incomplete processing
      const existingJob = await webhookQueue.getJob(deterministicJobId).catch(() => null);
      if (existingJob) {
        const state = await existingJob.getState().catch(() => null);
        if (state === 'failed') {
          await existingJob.remove().catch(() => {});
        }
      }

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
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const opts = {
            throwOnError: true,
            queueName: `${WEBHOOK_QUEUE_NAME}-inline`,
            retryAttempt: attempt
          };
          if (platform === 'whatsapp') {
            const waController = require('../controllers/webhookController');
            await waController.processWebhookPayload(payload, opts);
          } else if (platform === 'instagram') {
            const igController = require('../controllers/instagramWebhookController');
            await igController.processWebhookPayload(payload, opts);
          } else if (platform === 'facebook') {
            const fbController = require('../controllers/facebookWebhookController');
            await fbController.processWebhookPayload(payload, opts);
          } else if (platform === 'telegram') {
            const tgController = require('../controllers/telegramWebhookController');
            await tgController.processWebhookPayload(payload, opts);
          }

          await WebhookLog.create({
            platform,
            eventType,
            payload,
            status: 'PROCESSED'
          }).catch(() => {});
          break;
        } catch (inlineErr) {
          logger.error(`[Webhook Inline Error] Attempt ${attempt}/${maxAttempts} failed for ${platform} webhook: ${inlineErr.message}`, {
            service: 'webhookQueue',
            provider: platform,
            queueName: `${WEBHOOK_QUEUE_NAME}-inline`,
            retryAttempt: attempt,
            stage: 'inline_webhook_worker'
          });
          if (attempt === maxAttempts) {
            await WebhookLog.create({
              platform,
              eventType,
              payload,
              status: 'FAILED',
              error: inlineErr.message
            }).catch(() => {});
          } else {
            await new Promise((r) => setTimeout(r, attempt * 1000));
          }
        }
      }
    });
  }
};

// Initialize the worker that actually processes the webhooks
const webhookWorker = new Worker(WEBHOOK_QUEUE_NAME, async (job) => {
  const { platform, eventType, payload } = job.data;
  const retryAttempt = (job.attemptsMade || 0) + 1;

  logger.info(`[BullMQ] Processing webhook for ${platform} (${eventType}) [Job: ${job.id}, Attempt: ${retryAttempt}]`);

  try {
    const workerOptions = {
      throwOnError: true,
      jobId: job.id,
      queueName: WEBHOOK_QUEUE_NAME,
      retryAttempt
    };

    // Import controllers dynamically to avoid circular dependencies
    if (platform === 'whatsapp') {
      const waController = require('../controllers/webhookController');
      await waController.processWebhookPayload(payload, workerOptions);
    } else if (platform === 'instagram') {
      const igController = require('../controllers/instagramWebhookController');
      await igController.processWebhookPayload(payload, workerOptions);
    } else if (platform === 'facebook') {
      const fbController = require('../controllers/facebookWebhookController');
      await fbController.processWebhookPayload(payload, workerOptions);
    } else if (platform === 'telegram') {
      const tgController = require('../controllers/telegramWebhookController');
      await tgController.processWebhookPayload(payload, workerOptions);
    }

    // Mark as processed in DB
    await WebhookLog.updateOne(
      { platform, eventType, 'payload.entry': payload.entry },
      { $set: { status: 'PROCESSED', processedAt: new Date() } }
    ).catch(() => {});

  } catch (err) {
    logger.error(`[BullMQ] Webhook processing failed for ${platform}: ${err.message}`, {
      service: 'webhookQueue',
      provider: platform,
      queueName: WEBHOOK_QUEUE_NAME,
      jobId: job.id ? String(job.id) : undefined,
      retryAttempt,
      stage: 'worker_processing',
      stack: err.stack
    });

    await WebhookLog.updateOne(
      { platform, eventType, 'payload.entry': payload.entry },
      { $set: { status: 'FAILED', error: err.message } }
    ).catch(() => {});
    throw err; // Trigger BullMQ retry
  }
}, {
  connection: redis,
  concurrency: 5, // Process 5 webhooks concurrently
  stalledInterval: 300000, // Reduced for Upstash limits
  metrics: { maxDataPoints: 0 }
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`[BullMQ] Job ${job?.id} failed: ${err.message}`, {
    service: 'webhookQueue',
    provider: job?.data?.platform || 'internal',
    queueName: WEBHOOK_QUEUE_NAME,
    jobId: job?.id ? String(job.id) : undefined,
    retryAttempt: job?.attemptsMade || 1,
    stage: 'job_failed_event'
  });
});

module.exports = {
  webhookQueue,
  webhookWorker,
  enqueueWebhook
};
