const Organization = require('../models/Organization');
const User = require('../models/User');
const AppError = require('../utils/AppError');

exports.injectOrganization = async (req, res, next) => {
  try {
    if (!req.user) return next();

    // Priority 1: explicit header from frontend
    const headerOrgId = req.headers['x-organization-id'];
    let organizationId = headerOrgId;

    // Priority 2: user's saved current organization from DB
    if (!organizationId && req.user.currentOrganization) {
      organizationId = req.user.currentOrganization;
    }

    // Priority 3: fallback — find any org user belongs to
    if (!organizationId) {
      const org = await Organization.findOne({ 'members.user': req.user._id, isActive: true });
      if (org) {
        organizationId = org._id;
        User.findByIdAndUpdate(req.user._id, { currentOrganization: organizationId }).exec();
      }
    }

    if (organizationId) {
      const org = await Organization.findOne({
        _id: organizationId,
        'members.user': req.user._id,
        isActive: true
      });

      if (org) {
        req.organization = org;
      } else {
        // Header org not found OR saved org invalid — find any valid org as fallback
        // This handles stale localStorage values gracefully (no 404!)
        const fallbackOrg = await Organization.findOne({ 'members.user': req.user._id, isActive: true });
        if (fallbackOrg) {
          req.organization = fallbackOrg;
          // Update user's current org to the valid one
          User.findByIdAndUpdate(req.user._id, { currentOrganization: fallbackOrg._id }).exec();
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.requireOrganization = (req, res, next) => {
  if (!req.organization) {
    return next(new AppError('Please select or create an organization to continue.', 400));
  }
  next();
};
