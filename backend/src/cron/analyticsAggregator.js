const cron = require('node-cron');
const logger = require('../utils/logger');
// const Analytics = require('../models/Analytics');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('[CRON] Starting analytics aggregation');
  try {
    // Example: Aggregate total messages sent yesterday per org and save to a daily snapshot table
    logger.info('[CRON] Analytics aggregation completed.');
  } catch (err) {
    logger.error(`[CRON] Analytics aggregation failed: ${err.message}`);
  }
});