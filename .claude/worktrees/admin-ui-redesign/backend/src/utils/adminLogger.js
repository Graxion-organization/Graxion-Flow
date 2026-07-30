const AdminActivity = require('../models/AdminActivity');
const User = require('../models/User');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Logs an administrative action to the AdminActivity database.
 * If the current admin user is missing an adminAccessKey, it dynamically generates one.
 */
const logAdminActivity = async (req, action, details) => {
  try {
    if (!req.user || req.user.role !== 'admin') return;

    // Self-healing: if an admin user somehow has no adminAccessKey, generate and assign it
    if (!req.user.adminAccessKey) {
      req.user.adminAccessKey = `ADM-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      await User.updateOne(
        { _id: req.user._id },
        { $set: { adminAccessKey: req.user.adminAccessKey } }
      );
    }

    await AdminActivity.create({
      adminId: req.user._id,
      adminEmail: req.user.email,
      adminAccessKey: req.user.adminAccessKey,
      action,
      details,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  } catch (err) {
    logger.error('Error logging admin activity:', err);
  }
};

module.exports = { logAdminActivity };
