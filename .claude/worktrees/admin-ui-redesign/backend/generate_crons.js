const fs = require('fs');
const path = require('path');

const cronDir = path.join(__dirname, 'src', 'cron');

const crons = {
  'usageReset.js': `const cron = require('node-cron');
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
    logger.info(\`[CRON] Usage reset completed. Updated \${result.modifiedCount} users.\`);
  } catch (err) {
    logger.error(\`[CRON] Usage reset failed: \${err.message}\`);
  }
});`,

  'subscriptionExpiry.js': `const cron = require('node-cron');
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
      logger.info(\`[CRON] Suspended user \${user._id} due to expired subscription\`);
    }
  } catch (err) {
    logger.error(\`[CRON] Expiry check failed: \${err.message}\`);
  }
});`,

  'conversationCloser.js': `const cron = require('node-cron');
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
      logger.info(\`[CRON] Auto-closed \${result.modifiedCount} stale conversations\`);
    }
  } catch (err) {
    logger.error(\`[CRON] Conversation closer failed: \${err.message}\`);
  }
});`,

  'tokenRefresh.js': `const cron = require('node-cron');
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
    logger.info(\`[CRON] Found \${accounts.length} tokens nearing expiration.\`);
  } catch (err) {
    logger.error(\`[CRON] Token refresh failed: \${err.message}\`);
  }
});`,

  'analyticsAggregator.js': `const cron = require('node-cron');
const logger = require('../utils/logger');
// const Analytics = require('../models/Analytics');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('[CRON] Starting analytics aggregation');
  try {
    // Example: Aggregate total messages sent yesterday per org and save to a daily snapshot table
    logger.info('[CRON] Analytics aggregation completed.');
  } catch (err) {
    logger.error(\`[CRON] Analytics aggregation failed: \${err.message}\`);
  }
});`,

  'index.js': `require('./usageReset');
require('./subscriptionExpiry');
require('./conversationCloser');
require('./tokenRefresh');
require('./analyticsAggregator');
const logger = require('../utils/logger');

logger.info('✅ Automated Cron Jobs Initialized');`
};

for (const [filename, code] of Object.entries(crons)) {
  fs.writeFileSync(path.join(cronDir, filename), code);
  console.log('Created ' + filename);
}
