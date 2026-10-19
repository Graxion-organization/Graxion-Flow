const express = require('express');
const router = express.Router();

const { developerRequestContext, sendDeveloperError } = require('../middleware/requestContext');
const {
  authenticateDeveloperService,
  requireScopes,
  requireWorkspaceAccess
} = require('../middleware/developerAuth');
const { developerRateLimiter } = require('../middleware/developerRateLimit');
const { enforceIdempotency } = require('../middleware/idempotency');
const { validateDeveloperBody, developerSchemas } = require('../middleware/developerValidation');

const systemController = require('../controllers/systemController');
const leadsController = require('../controllers/leadsController');
const crmController = require('../controllers/crmController');
const automationsController = require('../controllers/automationsController');
const webhooksController = require('../controllers/webhooksController');
const diagnosticsController = require('../controllers/diagnosticsController');

// Attach requestId, version headers, and S2S audit logger to all Developer API v1 requests
router.use(developerRequestContext);

// ─── Public / Pre-Auth Endpoints ─────────────────────────────────────────────
router.get('/health', systemController.getHealth);
router.post(
  '/oauth/token',
  validateDeveloperBody(developerSchemas.oauthToken),
  systemController.issueOAuthToken
);

// ─── Authenticated S2S Management Plane Endpoints ────────────────────────────
router.use(authenticateDeveloperService);
router.use(developerRateLimiter);
router.use(enforceIdempotency);

// System & Capability Discovery
router.get('/capabilities', requireScopes('system:read'), systemController.getCapabilities);
router.get('/openapi.json', requireScopes('system:read'), systemController.getOpenApiSpec);

// Credential Rotation & Revocation
router.post(
  '/auth/rotate-secret',
  requireScopes('auth:manage'),
  validateDeveloperBody(developerSchemas.rotateSecret),
  systemController.rotateSecret
);
router.post(
  '/auth/revoke-token',
  requireScopes('auth:manage'),
  validateDeveloperBody(developerSchemas.revokeToken),
  systemController.revokeToken
);

// ─── Workspace-Scoped Endpoints (Require X-Organization-Id + Ownership) ──────

// 1. WhatsApp & Omnichannel Leads
router.get(
  '/leads',
  requireWorkspaceAccess,
  requireScopes('leads:read'),
  leadsController.listLeads
);
router.get(
  '/leads/:conversationId',
  requireWorkspaceAccess,
  requireScopes('leads:read'),
  leadsController.getLead
);

// 2. CRM Contacts
router.get(
  '/contacts',
  requireWorkspaceAccess,
  requireScopes('contacts:read'),
  crmController.listContacts
);
router.post(
  '/contacts',
  requireWorkspaceAccess,
  requireScopes('contacts:write'),
  validateDeveloperBody(developerSchemas.createContact),
  crmController.createContact
);
router.get(
  '/contacts/:id',
  requireWorkspaceAccess,
  requireScopes('contacts:read'),
  crmController.getContact
);
router.patch(
  '/contacts/:id',
  requireWorkspaceAccess,
  requireScopes('contacts:write'),
  validateDeveloperBody(developerSchemas.updateContact),
  crmController.updateContact
);
router.delete(
  '/contacts/:id',
  requireWorkspaceAccess,
  requireScopes('contacts:write'),
  crmController.deleteContact
);

// 3. CRM Deals
router.get(
  '/deals',
  requireWorkspaceAccess,
  requireScopes('deals:read'),
  crmController.listDeals
);
router.post(
  '/deals',
  requireWorkspaceAccess,
  requireScopes('deals:write'),
  validateDeveloperBody(developerSchemas.createDeal),
  crmController.createDeal
);
router.get(
  '/deals/:id',
  requireWorkspaceAccess,
  requireScopes('deals:read'),
  crmController.getDeal
);
router.patch(
  '/deals/:id',
  requireWorkspaceAccess,
  requireScopes('deals:write'),
  validateDeveloperBody(developerSchemas.updateDeal),
  crmController.updateDeal
);
router.delete(
  '/deals/:id',
  requireWorkspaceAccess,
  requireScopes('deals:write'),
  crmController.deleteDeal
);

// 4. Automations (AI Agents & Flows)
router.get(
  '/automations/agents',
  requireWorkspaceAccess,
  requireScopes('automations:read'),
  automationsController.listAgents
);
router.post(
  '/automations/agents/:id/invoke',
  requireWorkspaceAccess,
  requireScopes('automations:trigger'),
  validateDeveloperBody(developerSchemas.invokeAgent),
  automationsController.invokeAgent
);
router.get(
  '/automations/flows',
  requireWorkspaceAccess,
  requireScopes('automations:read'),
  automationsController.listFlows
);
router.get(
  '/automations/flows/:id',
  requireWorkspaceAccess,
  requireScopes('automations:read'),
  automationsController.getFlow
);
router.post(
  '/automations/flows/:id/trigger',
  requireWorkspaceAccess,
  requireScopes('automations:trigger'),
  validateDeveloperBody(developerSchemas.triggerFlow),
  automationsController.triggerFlow
);

// 5. Outbound Webhooks & Deliveries
router.get(
  '/webhooks/subscriptions',
  requireWorkspaceAccess,
  requireScopes('webhooks:read'),
  webhooksController.listSubscriptions
);
router.post(
  '/webhooks/subscriptions',
  requireWorkspaceAccess,
  requireScopes('webhooks:write'),
  validateDeveloperBody(developerSchemas.createWebhookSubscription),
  webhooksController.createSubscription
);
router.get(
  '/webhooks/subscriptions/:id',
  requireWorkspaceAccess,
  requireScopes('webhooks:read'),
  webhooksController.getSubscription
);
router.patch(
  '/webhooks/subscriptions/:id',
  requireWorkspaceAccess,
  requireScopes('webhooks:write'),
  validateDeveloperBody(developerSchemas.updateWebhookSubscription),
  webhooksController.updateSubscription
);
router.delete(
  '/webhooks/subscriptions/:id',
  requireWorkspaceAccess,
  requireScopes('webhooks:write'),
  webhooksController.deleteSubscription
);
router.post(
  '/webhooks/subscriptions/:id/test',
  requireWorkspaceAccess,
  requireScopes('webhooks:write'),
  webhooksController.testSubscription
);
router.get(
  '/webhooks/deliveries',
  requireWorkspaceAccess,
  requireScopes('webhooks:read'),
  webhooksController.listDeliveries
);
router.post(
  '/webhooks/deliveries/:id/retry',
  requireWorkspaceAccess,
  requireScopes('webhooks:write'),
  webhooksController.retryDelivery
);

// 6. Diagnostics & Usage Analytics
router.get(
  '/diagnostics/usage',
  requireWorkspaceAccess,
  requireScopes('diagnostics:read'),
  diagnosticsController.getUsageDiagnostics
);
router.get(
  '/diagnostics/requests',
  requireWorkspaceAccess,
  requireScopes('diagnostics:read'),
  diagnosticsController.getRequestDiagnostics
);
router.get(
  '/diagnostics/webhooks-inbound',
  requireWorkspaceAccess,
  requireScopes('diagnostics:read'),
  diagnosticsController.getInboundWebhookDiagnostics
);

// Developer API 404 handler
router.use((req, res) => {
  return sendDeveloperError(
    req,
    res,
    404,
    'ENDPOINT_NOT_FOUND',
    `Developer API endpoint ${req.method} ${req.originalUrl} not found.`
  );
});

module.exports = router;
