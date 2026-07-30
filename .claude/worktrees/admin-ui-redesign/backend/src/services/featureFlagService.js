const FeatureFlag = require('../models/FeatureFlag');
const logger = require('../utils/logger');

const crypto = require('crypto');

class FeatureFlagService {
  /**
   * Deterministically evaluate percentage rollout for a user.
   * Hashing the user's ID with the flag key ensures sticky/consistent assignment.
   */
  evaluatePercentage(userId, flagKey, percentage) {
    if (!userId || percentage === undefined || percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Hash the combination of userId and flagKey to get a stable value between 0 and 99
    const hash = crypto.createHash('md5').update(`${userId.toString()}-${flagKey}`).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const bucket = hashInt % 100;
    
    return bucket < percentage;
  }

  /**
   * Evaluate a single feature flag for a user
   */
  evaluateFlag(flag, user) {
    // Admins always have access to all features (no feature flag restrictions)
    if (user && user.role === 'admin') return true;

    // 1. Global kill switch
    if (!flag.isActive) return false;

    // If no user context, it's only active if it has 100% rollout and no targeted rules
    if (!user) {
      return flag.rules.rolloutPercentage === 100 && 
             (!flag.rules.targetPlans || flag.rules.targetPlans.length === 0) &&
             !flag.rules.betaOnly &&
             (!flag.rules.targetEmails || flag.rules.targetEmails.length === 0) &&
             (!flag.rules.targetUsers || flag.rules.targetUsers.length === 0);
    }

    const userIdStr = user._id ? user._id.toString() : '';
    const userEmail = user.email ? user.email.toLowerCase() : '';
    const userPlan = user.subscription?.plan || 'free';
    const isBeta = user.isBetaTester || false;
    const isAdmin = user.role === 'admin';

    // 2. Individual User Overrides (Direct targeting takes highest precedence)
    if (flag.rules.targetEmails && flag.rules.targetEmails.includes(userEmail)) {
      return true;
    }
    if (flag.rules.targetUsers && flag.rules.targetUsers.some(id => id.toString() === userIdStr)) {
      return true;
    }

    // 3. Beta Only Filter (Allows beta testers or admins)
    if (flag.rules.betaOnly) {
      if (!isBeta && !isAdmin) {
        return false;
      }
    }

    // 4. Plan-based Whitelist Filter
    if (flag.rules.targetPlans && flag.rules.targetPlans.length > 0) {
      if (!flag.rules.targetPlans.includes(userPlan)) {
        return false;
      }
    }

    // 5. Deterministic Percentage Rollout
    return this.evaluatePercentage(userIdStr, flag.key, flag.rules.rolloutPercentage);
  }

  /**
   * Evaluate all active flags for a user and increment their usage statistics
   */
  async evaluateAllFlagsForUser(user) {
    const flags = await FeatureFlag.find();
    const result = {};

    for (const flag of flags) {
      const isEnabled = this.evaluateFlag(flag, user);
      result[flag.key] = isEnabled;
      
      // Update stats asynchronously for administration insights
      const updateField = isEnabled ? 'evalStats.enabledCount' : 'evalStats.disabledCount';
      FeatureFlag.updateOne({ _id: flag._id }, { $inc: { [updateField]: 1 } }).catch(err => {
        logger.error(`Error updating feature flag stats for ${flag.key}:`, err);
      });
    }

    return result;
  }
}

module.exports = new FeatureFlagService();
