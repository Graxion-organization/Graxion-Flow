const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/emailService');

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('[CRON] Starting subscription warning check');
  try {
    const activeUsers = await User.find({
      'subscription.plan': { $ne: 'free' },
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $gt: new Date() }
    });

    const now = new Date();
    
    for (const user of activeUsers) {
      const end = new Date(user.subscription.currentPeriodEnd);
      const timeDiff = end.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // We alert on exactly 7, 3, and 1 days before expiry
      if ([7, 3, 1].includes(daysRemaining)) {
        logger.info(`[CRON] Subscription warning: User ${user.email} has ${daysRemaining} days remaining`);

        // 1. Create in-app notification
        try {
          await Notification.create({
            user: user._id,
            type: 'subscription_warning',
            title: `Subscription Expiring in ${daysRemaining} Days`,
            message: `Your ${user.subscription.plan.toUpperCase()} plan is expiring in ${daysRemaining} days. Renew now to avoid automation pauses!`,
            metadata: { daysRemaining, plan: user.subscription.plan }
          });
        } catch (notifErr) {
          logger.warn(`Failed to create expiry notification for ${user.email}: ${notifErr.message}`);
        }

        // 2. Send warning email
        try {
          const subject = daysRemaining === 1 
            ? 'Action Required: Your subscription expires tomorrow!' 
            : `Your subscription expires in ${daysRemaining} days`;

          const alertText = daysRemaining === 1
            ? 'expires tomorrow! Please renew today to prevent all workspaces, automations, and AI agents from being suspended.'
            : `expires in ${daysRemaining} days. You can easily extend or renew your subscription from settings.`;

          await sendEmail({
            to: user.email,
            subject,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #FF6A00;">Subscription Expiry Alert</h2>
                <p>Hi ${user.name},</p>
                <p>This is a friendly reminder that your active subscription/trial <strong>(${user.subscription.plan.toUpperCase()})</strong> ${alertText}</p>
                <p>If you have auto-renew enabled, please ensure your payment method is up-to-date.</p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://graxion.in'}/app/settings?tab=limits" style="background: #FF6A00; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold;">Renew Subscription</a>
                </div>
                <p style="color: #666; font-size: 12px;">Thank you for using our platform!<br/>The Team</p>
              </div>
            `
          });
        } catch (emailErr) {
          logger.warn(`Failed to send warning email to ${user.email}: ${emailErr.message}`);
        }
      }
    }
  } catch (err) {
    logger.error(`[CRON] Subscription warning check failed: ${err.message}`);
  }
});
