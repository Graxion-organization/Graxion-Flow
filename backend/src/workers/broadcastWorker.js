const { Queue, Worker } = require('bullmq');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');
const Broadcast = require('../models/Broadcast');
const Contact = require('../models/Contact');
const WhatsAppService = require('../services/whatsappService');

const BROADCAST_QUEUE_NAME = 'broadcast-jobs';

const broadcastQueue = new Queue(BROADCAST_QUEUE_NAME, {
  connection: redis,
});

const enqueueBroadcast = async (broadcastId, templateId, contactGroupId, whatsappAccountId, delayMs = 0) => {
  await broadcastQueue.add('send-broadcast', {
    broadcastId,
    templateId,
    contactGroupId,
    whatsappAccountId,
  }, { delay: delayMs });
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

    const { decrypt } = require('../utils/encryption');
    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

    const Template = require('../models/Template');
    const template = await Template.findById(templateId);
    if (!template) throw new Error('Template not found');

    // Fetch contacts in group
    let contactQuery = { organization: broadcast.organization };
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

    const BroadcastMessage = require('../models/BroadcastMessage');
    let sent = 0;
    let failed = 0;
    let broadcastMessagesBatch = [];
    const BATCH_SIZE = 50;

    for (const contact of contacts) {
      try {
        let messageComponents = [];
        if (template.components && Array.isArray(template.components)) {
          template.components.forEach(comp => {
            if (comp.type && typeof comp.text === 'string') {
              const matches = comp.text.match(/\{\{(\d+)\}\}/g);
              if (matches && matches.length > 0) {
                let maxVar = 0;
                matches.forEach(m => {
                  const num = parseInt(m.replace(/[{}]/g, ''));
                  if (num > maxVar) maxVar = num;
                });
                
                const parameters = [];
                for (let i = 1; i <= maxVar; i++) {
                  let val = '';
                  if (i === 1) val = contact.name || 'Customer';
                  else if (i === 2) val = contact.email || contact.phone || 'User';
                  else val = contact.customFields?.get(`var${i}`) || `Value ${i}`;
                  
                  parameters.push({ type: 'text', text: val });
                }
                
                messageComponents.push({
                  type: comp.type.toLowerCase(),
                  parameters
                });
              }
            }
          });
        }

        // --- SAFE DEBUG LOGGING & ISOLATION CHECKS ---
        if (waAccount.organization.toString() !== broadcast.organization.toString()) {
          throw new Error('SECURITY VIOLATION: WhatsApp Account does not belong to the broadcast organization.');
        }
        if (template.organization.toString() !== broadcast.organization.toString()) {
          throw new Error('SECURITY VIOLATION: Template does not belong to the broadcast organization.');
        }

        const result = await waService.sendTemplateMessage(contact.phone, template.name, template.language, messageComponents);
        const messageId = result?.messages?.[0]?.id;

        if (messageId) {
          broadcastMessagesBatch.push({
            broadcast: broadcast._id,
            organization: broadcast.organization,
            messageId: messageId,
            phone: contact.phone,
            status: 'sent'
          });
        }
        
        if (broadcastMessagesBatch.length >= BATCH_SIZE) {
          await BroadcastMessage.insertMany(broadcastMessagesBatch);
          broadcastMessagesBatch = [];
        }

        sent++;
      } catch (err) {
        logger.error(`Broadcast failed for ${contact.phone}: ${err.message}`);
        failed++;
      }
      
      // Basic rate limiting to respect Meta APIs (50 msgs / sec)
      await new Promise(r => setTimeout(r, 20));
    }

    if (broadcastMessagesBatch.length > 0) {
      await BroadcastMessage.insertMany(broadcastMessagesBatch);
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
  connection: redis,
  concurrency: 2, // Max 2 concurrent broadcasts
  stalledInterval: 300000, // Reduced for Upstash limits
  metrics: { maxDataPoints: 0 }
});

module.exports = {
  broadcastQueue,
  enqueueBroadcast
};
