const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user exists
    const user = await User.findById(decoded.id).select('+subscription +usage +currentOrganization');
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Contact support.', 401));
    }

    if (user.isAccountDisabled) {
      // Allow access only to cancellation and basic info
      const allowedRoutes = ['/api/auth/cancel-deletion-request', '/api/auth/me', '/api/auth/logout'];
      if (!allowedRoutes.includes(req.originalUrl.split('?')[0])) {
        return next(new AppError('Your account is disabled due to a pending deletion request. Restore your account to continue using the service.', 401));
      }
    }

    // Legacy lock check removed in favor of Redis-based fraud detection

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    logger.error('Auth middleware error:', err);
    return next(new AppError('Authentication failed.', 401));
  }
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

const checkSubscription = (...allowedPlans) => (req, res, next) => {
  const userPlan = req.user.subscription.plan;
  if (!allowedPlans.includes(userPlan)) {
    return next(new AppError(`This feature requires ${allowedPlans.join(' or ')} plan. Please upgrade.`, 403));
  }
  next();
};

const checkMessageLimit = async (req, res, next) => {
  const user = req.user;
  const limits = await user.getPlanLimits();

  // Reset monthly count if new month
  const now = new Date();
  const lastReset = new Date(user.usage.lastResetDate);
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    user.usage.messagesThisMonth = 0;
    user.usage.lastResetDate = now;
    await user.save({ validateBeforeSave: false });
  }

  if (user.usage.messagesThisMonth >= limits.messages) {
    return next(new AppError(`Monthly message limit (${limits.messages}) reached. Please upgrade your plan.`, 429));
  }

  next();
};

module.exports = { protect, restrictTo, checkSubscription, checkMessageLimit };
