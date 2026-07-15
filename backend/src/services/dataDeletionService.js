const User = require('../models/User');
const WhatsappAccount = require('../models/WhatsappAccount');
const TelegramAccount = require('../models/TelegramAccount');
const InstagramAccount = require('../models/InstagramAccount');
const Conversation = require('../models/Conversation');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

/**
 * Permanently delete a user and all their associated data
 */
const permanentlyDeleteUser = async (userId) => {
  try {
    logger.info(`Starting permanent deletion for user: ${userId}`);

    // Delete associated data in parallel
    await Promise.all([
      WhatsappAccount.deleteMany({ user: userId }),
      TelegramAccount.deleteMany({ user: userId }),
      InstagramAccount.deleteMany({ user: userId }),
      Conversation.deleteMany({ user: userId }),
      Agent.deleteMany({ user: userId }),
      // Add other models as they are added to the system
    ]);

    // Finally delete the user
    await User.findByIdAndDelete(userId);

    logger.info(`Successfully deleted user and all data: ${userId}`);
    return true;
  } catch (err) {
    logger.error(`Error deleting user ${userId}:`, err);
    throw err;
  }
};

/**
 * Check for users whose deletion request is older than 30 days
 */
const processPendingDeletions = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const usersToDelete = await User.find({
      isDeletionPending: true,
      deletionRequestedAt: { $lte: thirtyDaysAgo }
    });

    if (usersToDelete.length === 0) {
      return;
    }

    logger.info(`Found ${usersToDelete.length} users to permanently delete.`);

    for (const user of usersToDelete) {
      await permanentlyDeleteUser(user._id);
    }
  } catch (err) {
    logger.error('Error processing pending deletions:', err);
  }
};

/**
 * Initialize the deletion scheduler
 */
const startDeletionScheduler = () => {
  // Run once on startup
  processPendingDeletions();

  // Run every 24 hours
  setInterval(processPendingDeletions, 24 * 60 * 60 * 1000);
  
  logger.info('Data deletion scheduler started.');
};

module.exports = {
  startDeletionScheduler,
  permanentlyDeleteUser
};
