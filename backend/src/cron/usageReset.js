const cron = require('node-cron');
const User = require('../models/User');
const logger = require('../utils/logger');

// Run at midnight on the 1st of every month
cron.schedule('0 0 1 * *', async () => {
  logger.info('[CRON] Starting monthly usage reset');
  try {
    const result = await User.updateMany(
      {},
      { $set: { 'usage.messagesThisMonth': 0 } }
    );
    logger.info(`[CRON] Usage reset completed. Updated ${result.modifiedCount} users.`);
  } catch (err) {
    logger.error(`[CRON] Usage reset failed: ${err.message}`);
  }
});