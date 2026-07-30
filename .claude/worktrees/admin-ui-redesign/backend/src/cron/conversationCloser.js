const cron = require('node-cron');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

// Run hourly
cron.schedule('0 * * * *', async () => {
  logger.info('[CRON] Starting stale conversation closer');
  try {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await Conversation.updateMany(
      { status: 'active', lastMessageAt: { $lt: threshold } },
      { $set: { status: 'closed' } }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`[CRON] Auto-closed ${result.modifiedCount} stale conversations`);
    }
  } catch (err) {
    logger.error(`[CRON] Conversation closer failed: ${err.message}`);
  }
});