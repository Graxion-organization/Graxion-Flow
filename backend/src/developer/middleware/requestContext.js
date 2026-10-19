const crypto = require('crypto');
const DeveloperAuditLog = require('../../models/DeveloperAuditLog');
const logger = require('../../utils/logger');

/**
 * Attaches a unique requestId, response headers, and asynchronous S2S audit logging
 */
function developerRequestContext(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    incomingId && /^[a-zA-Z0-9_-]{4,64}$/.test(String(incomingId))
      ? String(incomingId)
      : `req_${crypto.randomBytes(10).toString('hex')}`;

  req.requestId = requestId;
  req.requestStartTime = Date.now();

  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-API-Version', '2026-10-01');

  res.on('finish', () => {
    const latencyMs = Date.now() - req.requestStartTime;
    const clientId = req.developerClient?.clientId || 'unauthenticated';
    const orgId = req.organization?._id || null;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;

    logger.info(`[DeveloperAPI] ${req.method} ${req.originalUrl} ${res.statusCode} (${latencyMs}ms)`, {
      requestId,
      clientId,
      organizationId: orgId ? String(orgId) : null,
      ip
    });

    // Persist audit record asynchronously (skip health checks to avoid log noise)
    if (!req.originalUrl.endsWith('/health') && typeof DeveloperAuditLog.create === 'function') {
      Promise.resolve(
        DeveloperAuditLog.create({
          requestId,
          clientId,
          organization: orgId,
          action: `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          latencyMs,
          ip,
          userAgent: req.get('user-agent') || 'unknown',
          scopesUsed: req.requiredScopesChecked || [],
          idempotencyKey: req.headers['idempotency-key'] || null,
          errorCode: res.locals?.errorCode || null
        })
      ).catch((err) => {
        logger.debug(`[DeveloperAPI] Audit log write skipped: ${err.message}`);
      });
    }
  });

  next();
}

/**
 * Consistent JSON response helper for Developer API v1
 */
function sendDeveloperSuccess(req, res, statusCode, data, meta = undefined) {
  const payload = {
    status: 'success',
    requestId: req.requestId,
    data
  };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

/**
 * Consistent JSON error formatter for Developer API v1
 */
function sendDeveloperError(req, res, statusCode, code, message, details = undefined) {
  res.locals.errorCode = code;
  const payload = {
    status: 'error',
    requestId: req.requestId,
    error: {
      code,
      message
    }
  };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  developerRequestContext,
  sendDeveloperSuccess,
  sendDeveloperError
};
