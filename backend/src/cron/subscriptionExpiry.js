const cron = require('node-cron');
const Organization = require('../models/Organization');
const User = require('../models/User');
const logger = require('../utils/logger');

// Run daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
  logger.info('[CRON] Checking subscription expiries');
  try {
    const expiredUsers = await User.find({
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $lt: new Date() }
    });

    for (const user of expiredUsers) {
      // In reality, you'd check Stripe/Razorpay API here to verify it didn't auto-renew
      user.subscription.status = 'past_due';
      await user.save();
      
      // Disable their org
      await Organization.updateMany({ owner: user._id }, { isActive: false });
      logger.info(`[CRON] Suspended user ${user._id} due to expired subscription`);
    }
  } catch (err) {
    logger.error(`[CRON] Expiry check failed: ${err.message}`);
  }
});