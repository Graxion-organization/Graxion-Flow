require('./usageReset');
require('./subscriptionExpiry');
require('./conversationCloser');
require('./tokenRefresh');
require('./analyticsAggregator');
require('./trialExpiry');
require('./subscriptionWarning');
const { initBackupCron } = require('./backup');
const logger = require('../utils/logger');

initBackupCron();

logger.info('✅ Automated Cron Jobs Initialized');