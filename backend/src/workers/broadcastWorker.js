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

    const Template = require('../models/Template');
    const template = await Template.findById(templateId);
    if (!template) throw new Error('Template not found');

    // Fetch contacts in group
    let contactQuery = { organization: broadcast.organization, optIn: true };
    if (contactGroupId && contactGroupId !== 'all') {
      const ContactGroup = require('../models/ContactGroup');
      const group = await ContactGroup.findById(contactGroupId);
      if (group && group.filterCriteria) {
        // If filter criteria exists, use it (simplified here)
        Object.assign(contactQuery, group.filterCriteria);
      } else {
        // Simplified fallback: maybe contacts don't have explicit array, but tags
        // For this MVP, if a group is selected, we assume filterCriteria has tags or similar
      }
    }

    const contacts = await Contact.find(contactQuery);

    let sent = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        await waService.sendTemplateMessage(contact.phone, template.name, template.language);
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
