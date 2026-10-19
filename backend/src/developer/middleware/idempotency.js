const crypto = require('crypto');
const redisClient = require('../../config/redisClient');
const { sendDeveloperError } = require('./requestContext');

// Fallback in-memory store when Redis is disconnected (e.g. test environment)
const memoryIdempotencyStore = new Map();
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function computePayloadHash(body) {
  const serialized = JSON.stringify(body || {});
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

async function getStoredRecord(cacheKey) {
  if (redisClient && redisClient.isReady && typeof redisClient.get === 'function') {
    try {
      const raw = await redisClient.get(cacheKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      // Fallback to memory store
    }
  }
  const entry = memoryIdempotencyStore.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryIdempotencyStore.delete(cacheKey);
    return null;
  }
  return entry.value;
}

async function setStoredRecord(cacheKey, value) {
  if (redisClient && redisClient.isReady && typeof redisClient.setEx === 'function') {
    try {
      await redisClient.setEx(cacheKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(value));
    } catch (_) {
      // Fallback to memory store
    }
  }
  memoryIdempotencyStore.set(cacheKey, {
    value,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000
  });
}

/**
 * Middleware: Idempotency-Key support for mutating Developer API requests
 */
async function enforceIdempotency(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const rawKey = req.headers['idempotency-key'];
  if (!rawKey) {
    return next();
  }

  const idempotencyKey = String(rawKey).trim();
  if (idempotencyKey.length < 4 || idempotencyKey.length > 128) {
    return sendDeveloperError(
      req,
      res,
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'Idempotency-Key header must be between 4 and 128 characters.'
    );
  }

  const clientId = req.developerClient?.clientId || 'anon';
  const orgId = req.organization?._id
    ? String(req.organization._id)
    : String(req.headers['x-organization-id'] || 'global').trim();
  const cacheKey = `dev_idemp:${clientId}:${orgId}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;
  const requestHash = computePayloadHash(req.body);

  const existing = await getStoredRecord(cacheKey);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return sendDeveloperError(
        req,
        res,
        409,
        'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
        'Idempotency-Key was already used with a different request payload.'
      );
    }

    res.setHeader('X-Idempotent-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.body);
  }

  // Intercept res.json to cache 2xx responses
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setStoredRecord(cacheKey, {
        requestHash,
        statusCode: res.statusCode,
        body
      }).catch(() => {});
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  enforceIdempotency,
  memoryIdempotencyStore
};
