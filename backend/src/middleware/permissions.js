const Organization = require('../models/Organization');

/**
 * Middleware to restrict access based on organization member roles.
 * Allowed roles: 'owner', 'admin', 'editor', 'viewer'
 * Role hierarchy: owner > admin > editor > viewer
 */
const requireRole = (minimumRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Bypass for superadmin or global admin
      if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
      }

      const organizationId = req.headers['x-organization-id'] || req.cookies?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID is required' });
      }

      const org = await Organization.findById(organizationId);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Check if user is the owner (global org owner)
      if (org.owner.toString() === req.user._id.toString()) {
        req.organization = org;
        req.memberRole = 'owner';
        return next();
      }

      // Check if user is a member
      const member = org.members.find(m => m.user.toString() === req.user._id.toString());
      
      if (!member) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not a member of this organization' });
      }

      const roles = {
        'owner': 4,
        'admin': 3,
        'editor': 2,
        'viewer': 1
      };

      const userLevel = roles[member.role] || 0;
      const requiredLevel = roles[minimumRole];

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied: Requires \${minimumRole} role, but you are a \${member.role}` 
        });
      }

      req.organization = org;
      req.memberRole = member.role;
      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error checking permissions' });
    }
  };
};

module.exports = { requireRole };
