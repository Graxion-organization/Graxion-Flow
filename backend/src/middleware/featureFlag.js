const FeatureFlag = require('../models/FeatureFlag');
const featureFlagService = require('../services/featureFlagService');
const AppError = require('../utils/AppError');

/**
 * Middleware to restrict API access based on a feature flag.
 * Usage: router.get('/new-feature', checkFeatureFlag('advanced-analytics'), controller.newFeature)
 */
const checkFeatureFlag = (flagKey) => {
  return async (req, res, next) => {
    try {
      // Admins always bypass all feature flag checks (requires 'protect' middleware before this)
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      const flag = await FeatureFlag.findOne({ key: flagKey.toLowerCase() });
      
      if (!flag) {
        return next(new AppError(`Feature flag '${flagKey}' is not configured.`, 403));
      }

      // Evaluate the flag for the authenticated user (requires 'protect' middleware before this)
      const isEnabled = featureFlagService.evaluateFlag(flag, req.user);

      if (!isEnabled) {
        return next(new AppError(`Access denied. The feature '${flagKey}' is not enabled for your account.`, 403));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { checkFeatureFlag };
