const cron = require('node-cron');
const User = require('../models/User');
const Organization = require('../models/Organization');
const logger = require('../utils/logger');
const { sendEmail, emailTemplates } = require('../services/emailService');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('[CRON] Starting trial expiry check');
  try {
    const expiredTrials = await User.find({
      'subscription.plan': 'trial',
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $lt: new Date() }
    });

    for (const user of expiredTrials) {
      user.subscription.lastPlan = 'trial';
      
      // Downgrade user to free plan
      user.subscription.plan = 'free';
      user.subscription.status = 'active'; // Active status on free plan
      user.subscription.currentPeriodEnd = undefined;
      user.subscription.messageLimit = 100;
      user.subscription.agentLimit = 1;
      user.subscription.credits = 0;
      user.subscription.totalCredits = 0;
      await user.save();
      
      // Ensure workspaces remain active under the Free Plan limits
      await Organization.updateMany({ owner: user._id }, { isActive: true });
      
      logger.info(`[CRON] Downgraded user ${user._id} to Free Plan due to expired trial`);

      try {
        await sendEmail({
          to: user.email,
          subject: 'Your Free Trial Has Expired',
          html: `<p>Hi \${user.name},</p><p>Your free trial has expired. Please upgrade your plan to continue using WhatsApp Automation.</p>`
        });
      } catch (emailErr) {
        logger.warn(`Failed to send trial expiry email to \${user.email}: \${emailErr.message}`);
      }
    }
  } catch (err) {
    logger.error(`[CRON] Trial expiry check failed: \${err.message}`);
  }
});
