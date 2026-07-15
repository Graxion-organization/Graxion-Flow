const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

const AppError = require('../utils/AppError');

/**
 * Middleware to check if system or specific service is in maintenance mode
 */
const checkMaintenance = async (req, res, next) => {
  try {
    // Skip maintenance check for admin routes, auth routes (so admin can log in/check status), or if the user is an admin
    const isAdminRoute = req.originalUrl.startsWith('/api/admin');
    const isAuthRoute = req.originalUrl.startsWith('/api/auth');
    const isAdminUser = req.user && req.user.role === 'admin';

    if (isAdminRoute || isAuthRoute || isAdminUser) {
      return next();
    }

    // 1. Check Global Maintenance Mode
    const maintenanceSetting = await SystemSetting.findOne({ key: 'maintenance_mode' });
    if (maintenanceSetting && maintenanceSetting.value === true) {
      return next(new AppError('System is under maintenance. Please try again later.', 503));
    }

    // 2. Check Service-Specific Maintenance
    const path = req.originalUrl;
    let serviceKey = null;
    
    if (path.includes('/api/whatsapp')) serviceKey = 'whatsapp_enabled';
    else if (path.includes('/api/telegram')) serviceKey = 'telegram_enabled';
    else if (path.includes('/api/instagram')) serviceKey = 'instagram_enabled';
    else if (path.includes('/api/billing')) serviceKey = 'billing_enabled';
    else if (path.includes('/api/agents')) serviceKey = 'ai_enabled';

    if (serviceKey) {
      const serviceSetting = await SystemSetting.findOne({ key: serviceKey });
      if (serviceSetting && serviceSetting.value === false) {
        return next(new AppError(`${serviceKey.replace('_enabled', '').toUpperCase()} service is temporarily disabled.`, 503));
      }
    }

    next();
  } catch (err) {
    logger.error('Maintenance check error:', err);
    next();
  }
};

module.exports = { checkMaintenance };
