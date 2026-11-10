const cron = require('node-cron');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

// Run hourly — WhatsApp conversations are kept active after 24h per platform configuration
cron.schedule('0 * * * *', async () => {
  logger.debug('[CRON] Stale conversation auto-close skipped (WhatsApp messaging kept active after 24h)');
});