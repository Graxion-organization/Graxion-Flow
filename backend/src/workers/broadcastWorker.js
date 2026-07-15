const { Queue, Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const logger = require('../utils/logger');
const Broadcast = require('../models/Broadcast');
const Contact = require('../models/Contact');
const WhatsAppService = require('../services/whatsappService');

const BROADCAST_QUEUE_NAME = 'broadcast-jobs';

const broadcastQueue = new Queue(BROADCAST_QUEUE_NAME, {
  connection: redisConfig,
});

const enqueueBroadcast = async (broadcastId, templateId, contactGroupId, whatsappAccountId) => {
  await broadcastQueue.add('send-broadcast', {
    broadcastId,
    templateId,
    contactGroupId,
    whatsappAccountId,
  });
};

const broadcastWorker = new Worker(BROADCAST_QUEUE_NAME, async (job) => {
  const { broadcastId, templateId, contactGroupId, whatsappAccountId } = job.data;
  
  logger.info(`[BullMQ] Starting broadcast job ${broadcastId}`);

  try {
    const broadcast = await Broadcast.findById(broadcastId);
    if (!broadcast) throw new Error('Broadcast not found');

    broadcast.status = 'IN_PROGRESS';
    await broadcast.save();

    const WhatsappAccount = require('../models/WhatsappAccount');
    const waAccount = await WhatsappAccount.findById(whatsappAccountId).select('+accessToken');
    if (!waAccount) throw new Error('WhatsApp Account not found');

    const waService = new WhatsAppService(waAccount.accessToken, waAccount.phoneNumberId);

    // Fetch contacts in group
    const contacts = await Contact.find({ organization: broadcast.organization }); // simplistic for now, should filter by contactGroupId

    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      if (!contact.optIn) continue;

      try {
        await waService.sendTemplateMessage(contact.phone, templateId);
        sent++;
      } catch (err) {
        logger.error(`Broadcast failed for ${contact.phone}: ${err.message}`);
        failed++;
      }
      
      // Basic rate limiting to respect Meta APIs (50 msgs / sec)
      await new Promise(r => setTimeout(r, 20));
    }

    broadcast.status = 'COMPLETED';
    broadcast.sentCount = sent;
    broadcast.failedCount = failed;
    await broadcast.save();
    
    logger.info(`[BullMQ] Broadcast ${broadcastId} completed. Sent: ${sent}, Failed: ${failed}`);

  } catch (err) {
    logger.error(`[BullMQ] Broadcast failed: ${err.message}`);
    await Broadcast.findByIdAndUpdate(broadcastId, { status: 'FAILED' });
  }
}, {
  connection: redisConfig,
  concurrency: 2 // Max 2 concurrent broadcasts
});

module.exports = {
  broadcastQueue,
  enqueueBroadcast
};
