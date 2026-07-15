const cron = require('node-cron');
const WhatsappAccount = require('../models/WhatsappAccount');
const logger = require('../utils/logger');

// Run weekly (Sunday at 2:00 AM)
cron.schedule('0 2 * * 0', async () => {
  logger.info('[CRON] Checking Meta token expirations');
  try {
    const threshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires within 7 days
    
    const accounts = await WhatsappAccount.find({
      status: 'connected',
      tokenExpiresAt: { $lt: threshold }
    });

    // In a real scenario, you'd hit Facebook Graph API to swap for a new long-lived token
    logger.info(`[CRON] Found ${accounts.length} tokens nearing expiration.`);
  } catch (err) {
    logger.error(`[CRON] Token refresh failed: ${err.message}`);
  }
});