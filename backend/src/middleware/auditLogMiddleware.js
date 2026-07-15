const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Middleware to track data mutations (POST, PUT, PATCH, DELETE) for Enterprise orgs
 */
exports.auditLogger = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  res.send = function (body) {
    res.send = originalSend;

    // After response is sent, asynchronously log the audit event
    // Only log mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.user && req.user.organization) {
      // Determine action based on HTTP Method
      let action = 'OTHER';
      if (req.method === 'POST') action = 'CREATE';
      if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
      if (req.method === 'DELETE') action = 'DELETE';

      // Special cases
      if (req.path.includes('/login')) action = 'LOGIN';
      if (req.path.includes('/export')) action = 'EXPORT';
      if (req.path.includes('/import')) action = 'IMPORT';

      // Determine resource (e.g., /api/contacts -> contacts)
      const resource = req.baseUrl.split('/').pop() || req.path.split('/')[1] || 'unknown';

      // Try to extract resource ID if present in URL
      const pathParts = req.path.split('/');
      const potentialId = pathParts[pathParts.length - 1];
      const resourceId = potentialId.match(/^[0-9a-fA-F]{24}$/) ? potentialId : null;

      // Extract details without logging sensitive PII passwords
      const details = { ...req.body };
      if (details.password) delete details.password;
      if (details.passwordConfirm) delete details.passwordConfirm;

      // Log asynchronously
      AuditLog.create({
        organization: req.user.organization,
        actor: req.user._id,
        action,
        resource,
        resourceId,
        details,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }).catch(err => {
        logger.error('[AuditLogger] Failed to save audit log:', err);
      });
    }

    return res.send(body);
  };

  next();
};
