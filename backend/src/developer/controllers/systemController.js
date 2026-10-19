const mongoose = require('mongoose');
const redisClient = require('../../config/redisClient');
const DeveloperServiceClient = require('../../models/DeveloperServiceClient');
const WebhookSubscription = require('../../models/WebhookSubscription');
const openApiSpec = require('../openapi.json');
const {
  verifyClientCredentials,
  issueS2SToken,
  rotateClientSecret,
  revokeTokenJti
} = require('../middleware/developerAuth');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

exports.getHealth = (req, res) => {
  const mongoState = mongoose.connection?.readyState;
  const mongoStatus = mongoState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redisClient?.isReady ? 'connected' : 'disconnected';

  return sendDeveloperSuccess(req, res, 200, {
    service: 'graxion-developer-api',
    apiVersion: '2026-10-01',
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    dependencies: {
      mongodb: mongoStatus,
      redis: redisStatus
    },
    timestamp: new Date().toISOString()
  });
};

exports.getCapabilities = (req, res) => {
  return sendDeveloperSuccess(req, res, 200, {
    service: 'graxion-developer-api',
    apiVersion: '2026-10-01',
    authenticatedClient: {
      clientId: req.developerClient.clientId,
      name: req.developerClient.name,
      authMethod: req.developerClient.authMethod,
      scopes: req.developerClient.scopes,
      rateLimitPerMinute: req.developerClient.rateLimitPerMinute
    },
    modules: [
      { id: 'leads', basePath: '/api/developer/v1/leads', status: 'active' },
      { id: 'contacts', basePath: '/api/developer/v1/contacts', status: 'active' },
      { id: 'deals', basePath: '/api/developer/v1/deals', status: 'active' },
      { id: 'automations', basePath: '/api/developer/v1/automations', status: 'active' },
      { id: 'webhooks', basePath: '/api/developer/v1/webhooks', status: 'active' },
      { id: 'diagnostics', basePath: '/api/developer/v1/diagnostics', status: 'active' }
    ],
    supportedScopes: DeveloperServiceClient.ALLOWED_SCOPES,
    supportedWebhookEvents: WebhookSubscription.SUPPORTED_WEBHOOK_EVENTS,
    features: {
      idempotencyKeyHeader: 'Idempotency-Key',
      workspaceHeader: 'X-Organization-Id',
      requestIdHeader: 'X-Request-Id',
      webhookSignatureHeader: 'X-Graxion-Signature-256'
    }
  });
};

exports.getOpenApiSpec = (req, res) => {
  return res.status(200).json(openApiSpec);
};

exports.issueOAuthToken = async (req, res) => {
  const { client_id: clientId, client_secret: clientSecret, scope } = req.body;

  const verification = await verifyClientCredentials(clientId, clientSecret);
  if (!verification.valid) {
    const status = verification.reason === 'CLIENT_REVOKED' ? 403 : 401;
    return sendDeveloperError(
      req,
      res,
      status,
      verification.reason,
      'Invalid or revoked client credentials.'
    );
  }

  const requestedScopes = scope
    ? String(scope)
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const tokenResult = issueS2SToken(verification.client, requestedScopes);
  if (tokenResult.error) {
    return sendDeveloperError(req, res, 403, 'INVALID_SCOPE', tokenResult.error);
  }

  return sendDeveloperSuccess(req, res, 200, tokenResult);
};

exports.rotateSecret = async (req, res) => {
  const { newSecret, gracePeriodSeconds } = req.body;
  const clientId = req.developerClient.clientId;

  const result = await rotateClientSecret(clientId, newSecret, gracePeriodSeconds);
  if (!result) {
    return sendDeveloperError(req, res, 404, 'CLIENT_NOT_FOUND', 'S2S client record not found.');
  }

  return sendDeveloperSuccess(req, res, 200, {
    clientId: result.clientId,
    rotatedAt: result.rotatedAt,
    previousSecretExpiresAt: result.previousSecretExpiresAt,
    message: 'Client secret rotated successfully. Previous secret remains valid until grace period expiration.'
  });
};

exports.revokeToken = async (req, res) => {
  const { jti } = req.body;
  await revokeTokenJti(req.developerClient.clientId, jti);

  return sendDeveloperSuccess(req, res, 200, {
    jti,
    revoked: true,
    revokedAt: new Date().toISOString()
  });
};
