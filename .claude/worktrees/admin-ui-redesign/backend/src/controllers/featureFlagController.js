const FeatureFlag = require('../models/FeatureFlag');
const User = require('../models/User');
const featureFlagService = require('../services/featureFlagService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { logAdminActivity } = require('../utils/adminLogger');

/**
 * Get all feature flags (Admin Only)
 */
exports.getAllFlags = async (req, res, next) => {
  try {
    const flags = await FeatureFlag.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: flags.length,
      data: { flags }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed feature flag by ID (Admin Only)
 */
exports.getFlagDetails = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id)
      .populate('rules.targetUsers', 'name email role');
    
    if (!flag) {
      return next(new AppError('Feature flag not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { flag }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new feature flag (Admin Only)
 */
exports.createFlag = async (req, res, next) => {
  try {
    const { key, name, description, isActive, rules } = req.body;

    if (!key || !name) {
      return next(new AppError('Key and Name are required fields.', 400));
    }

    const existingFlag = await FeatureFlag.findOne({ key: key.toLowerCase().trim() });
    if (existingFlag) {
      return next(new AppError(`Feature flag key '${key}' already exists.`, 400));
    }

    const flag = await FeatureFlag.create({
      key: key.toLowerCase().trim(),
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      rules: {
        rolloutPercentage: rules?.rolloutPercentage !== undefined ? rules.rolloutPercentage : 100,
        targetUsers: rules?.targetUsers || [],
        targetEmails: rules?.targetEmails || [],
        targetPlans: rules?.targetPlans || [],
        betaOnly: rules?.betaOnly || false
      }
    });

    logger.info(`Feature flag created: ${flag.key} by admin ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      data: { flag }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing feature flag (Admin Only)
 */
exports.updateFlag = async (req, res, next) => {
  try {
    const { key, name, description, rules } = req.body;

    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) {
      return next(new AppError('Feature flag not found', 404));
    }

    if (key) {
      const sanitizedKey = key.toLowerCase().trim();
      if (sanitizedKey !== flag.key) {
        const existingFlag = await FeatureFlag.findOne({ key: sanitizedKey });
        if (existingFlag) {
          return next(new AppError(`Feature flag with key '${sanitizedKey}' already exists`, 400));
        }
        flag.key = sanitizedKey;
      }
    }

    if (name) flag.name = name;
    if (description !== undefined) flag.description = description;
    
    if (rules) {
      if (rules.rolloutPercentage !== undefined) flag.rules.rolloutPercentage = rules.rolloutPercentage;
      if (rules.targetUsers !== undefined) flag.rules.targetUsers = rules.targetUsers;
      if (rules.targetEmails !== undefined) flag.rules.targetEmails = rules.targetEmails;
      if (rules.targetPlans !== undefined) flag.rules.targetPlans = rules.targetPlans;
      if (rules.betaOnly !== undefined) flag.rules.betaOnly = rules.betaOnly;
    }

    await flag.save();
    logger.info(`Feature flag updated: ${flag.key} by admin ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      data: { flag }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle feature flag active state (Admin Only: instant rollback/kill-switch)
 */
exports.toggleFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) {
      return next(new AppError('Feature flag not found', 404));
    }

    flag.isActive = !flag.isActive;
    await flag.save();

    logger.info(`Feature flag toggled: ${flag.key} is now ${flag.isActive ? 'ACTIVE' : 'INACTIVE'} by admin ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `Feature flag ${flag.key} is now ${flag.isActive ? 'active' : 'disabled'}.`,
      data: { flag }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a feature flag (Admin Only)
 */
exports.deleteFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findByIdAndDelete(req.params.id);
    if (!flag) {
      return next(new AppError('Feature flag not found', 404));
    }

    logger.warn(`Feature flag deleted: ${flag.key} by admin ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `Feature flag successfully deleted.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Evaluate all feature flags for the current logged-in user (User Context)
 */
exports.evaluateAllFlags = async (req, res, next) => {
  try {
    const evaluatedFlags = await featureFlagService.evaluateAllFlagsForUser(req.user);
    res.status(200).json({
      status: 'success',
      data: { flags: evaluatedFlags }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all beta testers (Admin Only)
 */
exports.getBetaTesters = async (req, res, next) => {
  try {
    const betaTesters = await User.find({ isBetaTester: true })
      .select('name email role isBetaTester subscription')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: betaTesters.length,
      data: { betaTesters }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Set isBetaTester status on a user (Admin Only)
 */
exports.updateUserBetaStatus = async (req, res, next) => {
  try {
    const { isBetaTester } = req.body;
    
    if (isBetaTester === undefined) {
      return next(new AppError('isBetaTester field is required', 400));
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isBetaTester = isBetaTester;
    await user.save({ validateBeforeSave: false });

    logger.info(`User beta status updated: ${user.email} isBetaTester=${user.isBetaTester} by admin ${req.user.email}`);

    // Log administrative beta tester status override activity
    await logAdminActivity(
      req, 
      isBetaTester ? 'promote_beta' : 'demote_beta', 
      `${isBetaTester ? 'Promoted' : 'Demoted'} user ${user.email} ${isBetaTester ? 'to' : 'from'} Beta Tester`
    );

    res.status(200).json({
      status: 'success',
      message: `User beta status updated successfully.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isBetaTester: user.isBetaTester
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
