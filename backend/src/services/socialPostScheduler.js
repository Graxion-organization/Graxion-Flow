const cron = require('node-cron');
const SocialPostJob = require('../models/SocialPostJob');
const SocialPostOrchestratorService = require('./socialPostOrchestratorService');
const logger = require('../utils/logger');

let initialized = false;

/**
 * Minimal Reliable Queue implementation using MongoDB as the backend.
 * Features: Atomic locking, Crash recovery, Delayed execution, and Duplicate prevention.
 */
const startSocialPostScheduler = () => {
  if (initialized) return;
  initialized = true;

  // 1. Worker: Process ready-to-run scheduled jobs
  cron.schedule('*/30 * * * * *', async () => {
    try {
      // Atomic Lock: Find one queued job and mark it as processing immediately
      // This prevents multiple worker instances from picking the same job.
      const job = await SocialPostJob.findOneAndUpdate(
        {
          mode: 'scheduled',
          overallStatus: 'queued',
          scheduledAt: { $lte: new Date() },
        },
        { $set: { overallStatus: 'processing', startedAt: new Date() } },
        { new: true, sort: { scheduledAt: 1 } }
      );

      if (job) {
        logger.info(`[Queue] Locked job ${job._id} for processing.`);
        // Run synchronously within the worker tick to maintain control
        await SocialPostOrchestratorService.runJob(job);
      }
    } catch (err) {
      logger.error(`[Queue] Worker error: ${err.message}`);
    }
  });

  // 2. Recovery Manager: Recover jobs stuck in 'processing' (e.g. after server crash)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const STUCK_THRESHOLD = 15 * 60 * 1000; // 15 minutes
      const stuckTime = new Date(Date.now() - STUCK_THRESHOLD);

      const recovered = await SocialPostJob.updateMany(
        {
          overallStatus: 'processing',
          startedAt: { $lte: stuckTime }
        },
        { 
          $set: { 
            overallStatus: 'failed', 
            completedAt: new Date() 
          },
          $push: { 
            'compatibility.warnings': { 
              platform: 'system', 
              message: 'Job was stuck in processing for too long and was automatically terminated.' 
            } 
          }
        }
      );

      if (recovered.modifiedCount > 0) {
        logger.warn(`[Queue] Recovered ${recovered.modifiedCount} stalled jobs and moved to DLQ (failed status).`);
      }
    } catch (err) {
      logger.error(`[Queue] Recovery manager error: ${err.message}`);
    }
  });

  // 3. YouTube Automation: Process comment auto-replies every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const YoutubeAutomationService = require('./youtubeAutomationService');
      await YoutubeAutomationService.runAutomation();
    } catch (err) {
      logger.error(`[YouTube Automation] Scheduler error: ${err.message}`);
    }
  });
 
  // 4. WhatsApp Scheduled Broadcasts: Process scheduled broadcasts every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const Broadcast = require('../models/Broadcast');
      const { enqueueBroadcast } = require('../workers/broadcastWorker');
      
      const broadcast = await Broadcast.findOneAndUpdate(
        {
          status: 'SCHEDULED',
          scheduledAt: { $lte: new Date() }
        },
        { $set: { status: 'IN_PROGRESS' } },
        { new: true, sort: { scheduledAt: 1 } }
      );
 
      if (broadcast) {
        logger.info(`[Broadcast Scheduler] Found scheduled broadcast ${broadcast._id} (${broadcast.name}). Queueing for execution.`);
        await enqueueBroadcast(broadcast._id, broadcast.template, broadcast.contactGroup, broadcast.whatsappAccountId);
      }
    } catch (err) {
      logger.error(`[Broadcast Scheduler] Error processing scheduled broadcast: ${err.message}`);
    }
  });
 
  logger.info('Reliable Social Post Scheduler initialized (30s tick).');
  logger.info('YouTube Comment Automation initialized (5m tick).');
  logger.info('WhatsApp Broadcast Scheduler initialized (30s tick).');
};
 
module.exports = { startSocialPostScheduler };
