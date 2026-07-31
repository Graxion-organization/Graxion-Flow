const cron = require('node-cron');
const Organization = require('../models/Organization');
const User = require('../models/User');
const logger = require('../utils/logger');

// Run daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
  logger.info('[CRON] Checking subscription expiries');
  try {
    const now = new Date();

    // 1. Process active users who expired (status: active)
    const expiredActiveUsers = await User.find({
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $lt: now }
    });

    for (const user of expiredActiveUsers) {
      // Save last paid plan
      user.subscription.lastPlan = user.subscription.plan;
      
      // Downgrade user to free plan
      user.subscription.plan = 'free';
      user.subscription.status = 'active'; // Active status but on free plan
      user.subscription.currentPeriodEnd = undefined;
      user.subscription.messageLimit = 100;
      user.subscription.agentLimit = 1;
      user.subscription.credits = 0;
      user.subscription.totalCredits = 0;
      await user.save();
      
      // Ensure workspaces remain active under the Free Plan limits
      await Organization.updateMany({ owner: user._id }, { isActive: true });
      logger.info(`[CRON] Downgraded expired active user ${user._id} to Free Plan`);
    }

    // 2. Process cancelled users who expired (status: cancelled)
    const expiredCancelledUsers = await User.find({
      'subscription.status': 'cancelled',
      'subscription.currentPeriodEnd': { $lt: now }
    });

    for (const user of expiredCancelledUsers) {
      // Save last paid plan
      user.subscription.lastPlan = user.subscription.plan;

      // Downgrade user to free plan
      user.subscription.plan = 'free';
      user.subscription.status = 'active'; // Active status but on free plan
      user.subscription.currentPeriodEnd = undefined;
      user.subscription.messageLimit = 100;
      user.subscription.agentLimit = 1;
      user.subscription.credits = 0;
      user.subscription.totalCredits = 0;
      await user.save();

      // Ensure their workspaces remain/become active under the Free Plan limits
      await Organization.updateMany({ owner: user._id }, { isActive: true });
      logger.info(`[CRON] Downgraded cancelled user ${user._id} to Free Plan`);
    }

  } catch (err) {
    logger.error(`[CRON] Expiry check failed: ${err.message}`);
  }
});