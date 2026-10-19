const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Configure test environment before loading server
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.JWT_SECRET = 'test_flow_user_jwt_secret_key_32_chars';
process.env.DEVELOPER_JWT_SECRET = 'test_developer_s2s_jwt_secret_key_32_chars';
process.env.DEVELOPER_MGMT_CLIENT_ID = 'graxion_mgmt_test_client';
process.env.DEVELOPER_MGMT_CLIENT_SECRET = 'super_secret_s2s_mgmt_credential_2026';
process.env.DEVELOPER_MGMT_SCOPES = '*';
process.env.ECOMMERCE_WEBHOOK_SECRET = 'shopify_test_webhook_secret_key';
process.env.DISABLE_INLINE_WORKERS = 'true';

// Mock external infrastructure connections so tests run fast and deterministically
jest.mock('../src/config/database', () => jest.fn());
jest.mock('../src/config/redisClient', () => ({
  isReady: false,
  connect: jest.fn().mockResolvedValue(true),
  on: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1)
}));
jest.mock('../src/utils/socket', () => ({
  initSocket: jest.fn().mockReturnValue({}),
  getIO: jest.fn(),
  emitToUser: jest.fn()
}));
jest.mock('../src/sockets/classNamespace', () => ({
  initializeClassNamespace: jest.fn()
}));
jest.mock('../src/services/socialPostScheduler', () => ({
  startSocialPostScheduler: jest.fn()
}));
jest.mock('../src/services/dataDeletionService', () => ({
  startDeletionScheduler: jest.fn()
}));
jest.mock('../src/jobs/instagramWorker', () => ({
  startInstagramWorker: jest.fn()
}));
jest.mock('../src/workers/instagramWebhookWorker', () => ({}));
jest.mock('../src/services/schedulerService', () => ({
  startAutoScheduler: jest.fn()
}));
jest.mock('../src/cron', () => ({}));

// Spy on express.application.listen
const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (port, cb) {
  if (cb) cb();
  return {
    close: (callback) => {
      if (callback) callback();
    },
    on: jest.fn()
  };
});

// Models to stub for unit/integration verification
const Organization = require('../src/models/Organization');
const Contact = require('../src/models/Contact');
const Deal = require('../src/models/Deal');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const Agent = require('../src/models/Agent');
const Flow = require('../src/models/Flow');
const WebhookSubscription = require('../src/models/WebhookSubscription');
const WebhookDelivery = require('../src/models/WebhookDelivery');
const DeveloperAuditLog = require('../src/models/DeveloperAuditLog');
const ApiUsageLog = require('../src/models/ApiUsageLog');
const WebhookLog = require('../src/models/WebhookLog');
const Integration = require('../src/models/Integration');
const rateLimitService = require('../src/services/rateLimitService');

const app = require('../src/server');
const developerStandaloneApp = require('../src/developerServer');

const ORG_A_ID = '65f1a1111111111111111111';
const ORG_B_ID = '65f1b2222222222222222222';
const CONTACT_A_ID = '65f1c3333333333333333333';
const DEAL_A_ID = '65f1d4444444444444444444';
const CONV_A_ID = '65f1e5555555555555555555';
const FLOW_A_ID = '65f1f6666666666666666666';
const SUB_A_ID = '65f197777777777777777777';

describe('Graxion Developer API v1 & Security Hardening Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Stub DeveloperAuditLog.create to resolve silently
    jest.spyOn(DeveloperAuditLog, 'create').mockResolvedValue({});
    jest.spyOn(rateLimitService, 'checkAndRecordApiCall').mockResolvedValue(true);

    // Stub Organization lookup for ORG_A and ORG_B
    jest.spyOn(Organization, 'findOne').mockImplementation((query) => {
      const id = String(query._id || '');
      const orgDoc =
        id === ORG_A_ID
          ? { _id: ORG_A_ID, name: 'Workspace Alpha', isActive: true }
          : id === ORG_B_ID
          ? { _id: ORG_B_ID, name: 'Workspace Beta', isActive: true }
          : null;
      return {
        lean: () => Promise.resolve(orgDoc)
      };
    });
  });

  afterAll(() => {
    listenSpy.mockRestore();
  });

  // ─── 1. HEALTH, CAPABILITIES & OPENAPI ─────────────────────────────────────
  describe('1. Health, Capabilities & OpenAPI Discovery', () => {
    test('GET /api/developer/v1/health returns 200 OK with X-Request-Id and X-API-Version', async () => {
      const res = await request(app)
        .get('/api/developer/v1/health')
        .expect(200);

      expect(res.headers['x-request-id']).toMatch(/^req_/);
      expect(res.headers['x-api-version']).toBe('2026-10-01');
      expect(res.body.status).toBe('success');
      expect(res.body.data.service).toBe('graxion-developer-api');
    });

    test('Standalone developerServer.js also serves /api/developer/v1/health independently', async () => {
      const res = await request(developerStandaloneApp)
        .get('/api/developer/v1/health')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.apiVersion).toBe('2026-10-01');
    });

    test('GET /api/developer/v1/capabilities returns authenticated client and supported modules', async () => {
      const res = await request(app)
        .get('/api/developer/v1/capabilities')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.authenticatedClient.clientId).toBe(process.env.DEVELOPER_MGMT_CLIENT_ID);
      expect(res.body.data.modules.map((m) => m.id)).toEqual(
        expect.arrayContaining(['leads', 'contacts', 'deals', 'automations', 'webhooks', 'diagnostics'])
      );
    });

    test('GET /api/developer/v1/openapi.json returns OpenAPI 3.0.3 spec', async () => {
      const res = await request(app)
        .get('/api/developer/v1/openapi.json')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .expect(200);

      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.paths['/leads']).toBeDefined();
      expect(res.body.paths['/contacts']).toBeDefined();
      expect(res.body.paths['/webhooks/subscriptions']).toBeDefined();
    });
  });

  // ─── 2. AUTHENTICATION, REVOCATION, ROTATION & SCOPES ──────────────────────
  describe('2. Private S2S Authentication, Revocation, Rotation & Scope Enforcement', () => {
    test('Rejects unauthenticated requests with 401 AUTHENTICATION_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/developer/v1/capabilities')
        .expect(401);

      expect(res.body.status).toBe('error');
      expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('Rejects invalid client secret with 401 INVALID_SECRET', async () => {
      const res = await request(app)
        .get('/api/developer/v1/capabilities')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', 'wrong_secret_value_12345')
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_SECRET');
    });

    test('Rejects regular Flow dashboard user JWTs on Developer S2S endpoints', async () => {
      const userJwt = jwt.sign({ id: '65f1a0000000000000000000' }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });

      const res = await request(app)
        .get('/api/developer/v1/capabilities')
        .set('Authorization', `Bearer ${userJwt}`)
        .expect(401);

      expect(res.body.error.code).toMatch(/INVALID_TOKEN/);
    });

    test('OAuth2 client_credentials flow issues short-lived Bearer token and enforces requested scopes', async () => {
      const tokenRes = await request(app)
        .post('/api/developer/v1/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: process.env.DEVELOPER_MGMT_CLIENT_ID,
          client_secret: process.env.DEVELOPER_MGMT_CLIENT_SECRET,
          scope: 'leads:read system:read'
        })
        .expect(200);

      const { access_token: accessToken, jti } = tokenRes.body.data;
      expect(accessToken).toBeDefined();
      expect(jti).toMatch(/^jti_/);

      // Allowed with system:read
      await request(app)
        .get('/api/developer/v1/capabilities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Blocked with 403 INSUFFICIENT_SCOPE on contacts:write
      const forbiddenRes = await request(app)
        .post('/api/developer/v1/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Organization-Id', ORG_A_ID)
        .send({ name: 'Test User', phone: '+919876543210' })
        .expect(403);

      expect(forbiddenRes.body.error.code).toBe('INSUFFICIENT_SCOPE');
    });

    test('Revoking a token JTI immediately blocks subsequent requests with that token', async () => {
      const tokenRes = await request(app)
        .post('/api/developer/v1/oauth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: process.env.DEVELOPER_MGMT_CLIENT_ID,
          client_secret: process.env.DEVELOPER_MGMT_CLIENT_SECRET
        })
        .expect(200);

      const { access_token: token, jti } = tokenRes.body.data;

      await request(app)
        .post('/api/developer/v1/auth/revoke-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ jti })
        .expect(200);

      const postRevoke = await request(app)
        .get('/api/developer/v1/capabilities')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(postRevoke.body.error.code).toBe('TOKEN_REVOKED');
    });

    test('Rotating secret keeps previous secret active during grace period and accepts new secret', async () => {
      const oldSecret = process.env.DEVELOPER_MGMT_CLIENT_SECRET;
      const newSecret = 'rotated_super_secret_s2s_mgmt_credential_2026_v2';

      await request(app)
        .post('/api/developer/v1/auth/rotate-secret')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', oldSecret)
        .send({ newSecret, gracePeriodSeconds: 3600 })
        .expect(200);

      // Both newSecret and oldSecret (within grace window) work
      await request(app)
        .get('/api/developer/v1/capabilities')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', newSecret)
        .expect(200);

      await request(app)
        .get('/api/developer/v1/capabilities')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', oldSecret)
        .expect(200);

      // Restore original secret for remaining tests
      const { runtimeSecretRotationState } = require('../src/developer/middleware/developerAuth');
      runtimeSecretRotationState.currentSecret = null;
      runtimeSecretRotationState.previousSecret = null;
    });
  });

  // ─── 3. CROSS-TENANT ISOLATION & WORKSPACE GUARDS ──────────────────────────
  describe('3. Cross-Tenant Isolation & Workspace Ownership', () => {
    test('Requires valid X-Organization-Id header on workspace routes', async () => {
      const missingRes = await request(app)
        .get('/api/developer/v1/leads')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .expect(400);
      expect(missingRes.body.error.code).toBe('ORGANIZATION_REQUIRED');

      const invalidRes = await request(app)
        .get('/api/developer/v1/leads')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', 'not-an-object-id')
        .expect(400);
      expect(invalidRes.body.error.code).toBe('INVALID_ORGANIZATION_ID');
    });

    test('Blocks S2S token scoped to ORG_A from accessing ORG_B (403 WORKSPACE_ACCESS_DENIED)', async () => {
      const restrictedToken = jwt.sign(
        {
          sub: process.env.DEVELOPER_MGMT_CLIENT_ID,
          typ: 'developer_s2s',
          scopes: ['*'],
          allowedOrganizations: [ORG_A_ID],
          jti: 'jti_org_restricted_test'
        },
        process.env.DEVELOPER_JWT_SECRET,
        {
          expiresIn: 3600,
          issuer: 'graxion-flow-developer-api',
          audience: 'graxion-developer-management-system'
        }
      );

      const res = await request(app)
        .get('/api/developer/v1/contacts')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .set('X-Organization-Id', ORG_B_ID)
        .expect(403);

      expect(res.body.error.code).toBe('WORKSPACE_ACCESS_DENIED');
    });

    test('Prevents ORG_A from reading or modifying a Contact owned by ORG_B', async () => {
      jest.spyOn(Contact, 'findOne').mockImplementation((filter) => {
        // Contact exists only in ORG_B
        const found =
          String(filter._id) === CONTACT_A_ID && String(filter.organization) === ORG_B_ID
            ? { _id: CONTACT_A_ID, organization: ORG_B_ID, name: 'Org B Contact', phone: '+919999999999' }
            : null;
        return {
          lean: () => Promise.resolve(found)
        };
      });

      const res = await request(app)
        .get(`/api/developer/v1/contacts/${CONTACT_A_ID}`)
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .expect(404);

      expect(res.body.error.code).toBe('CONTACT_NOT_FOUND');
    });
  });

  // ─── 4. LEADS, CRM, AUTOMATIONS, WEBHOOKS & IDEMPOTENCY ────────────────────
  describe('4. Functional Modules & Idempotency', () => {
    test('GET /api/developer/v1/leads scores WhatsApp conversation leads accurately', async () => {
      const mockConversations = [
        {
          _id: CONV_A_ID,
          organization: ORG_A_ID,
          customerName: 'Aarav Patel',
          customerPhone: '+919811122233',
          platform: 'whatsapp',
          status: 'human_handoff',
          totalMessages: 8,
          agent: { _id: '65f1a9999999999999999999', name: 'Sales Bot' },
          lastMessageAt: new Date()
        }
      ];

      jest.spyOn(Conversation, 'find').mockReturnValue({
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () => Promise.resolve(mockConversations)
              })
            })
          })
        })
      });
      jest.spyOn(Conversation, 'countDocuments').mockResolvedValue(1);
      jest.spyOn(Conversation, 'aggregate').mockResolvedValue([{ _id: 'whatsapp', count: 1 }]);
      jest.spyOn(Message, 'find').mockReturnValue({
        sort: () => ({
          select: () => ({
            lean: () =>
              Promise.resolve([
                {
                  conversationId: CONV_A_ID,
                  role: 'user',
                  content: 'Hi, what is the price and how can I buy your plan?'
                }
              ])
          })
        })
      });

      const res = await request(app)
        .get('/api/developer/v1/leads')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .expect(200);

      expect(res.body.data.leads).toHaveLength(1);
      const lead = res.body.data.leads[0];
      expect(lead.customerPhone).toBe('+919811122233');
      expect(lead.wantsHuman).toBe(true);
      expect(lead.matchedKeywords).toEqual(expect.arrayContaining(['price', 'buy', 'plan']));
      expect(lead.interestScore).toBeGreaterThanOrEqual(45);
    });

    test('POST /api/developer/v1/contacts enforces Idempotency-Key and strips mass-assigned fields', async () => {
      jest.spyOn(Contact, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(Contact, 'create').mockImplementation(async (doc) => ({
        _id: CONTACT_A_ID,
        ...doc
      }));

      const payload = {
        name: 'Priya Verma',
        phone: '+919876500001',
        email: 'priya@example.com',
        organization: ORG_B_ID, // Attempted mass-assignment override!
        _id: '65f1ffffffffffffffffffff'
      };

      const firstRes = await request(app)
        .post('/api/developer/v1/contacts')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .set('Idempotency-Key', 'idemp_contact_create_001')
        .send(payload)
        .expect(201);

      expect(firstRes.body.data.contact.organization).toBe(ORG_A_ID);
      expect(createSpy).toHaveBeenCalledTimes(1);

      // Replay identical request with same Idempotency-Key -> returns cached 201 without calling Contact.create again
      const replayRes = await request(app)
        .post('/api/developer/v1/contacts')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .set('Idempotency-Key', 'idemp_contact_create_001')
        .send(payload)
        .expect(201);

      expect(replayRes.headers['x-idempotent-replayed']).toBe('true');
      expect(createSpy).toHaveBeenCalledTimes(1);

      // Replay same Idempotency-Key with different payload -> 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH
      const conflictRes = await request(app)
        .post('/api/developer/v1/contacts')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .set('Idempotency-Key', 'idemp_contact_create_001')
        .send({
          name: 'Different Name',
          phone: '+919876500002'
        })
        .expect(409);

      expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    });

    test('POST /api/developer/v1/automations/flows/:id/trigger supports dryRun validation', async () => {
      jest.spyOn(Flow, 'findOne').mockReturnValue({
        lean: () =>
          Promise.resolve({
            _id: FLOW_A_ID,
            organization: ORG_A_ID,
            name: 'Welcome Onboarding Flow',
            isActive: true,
            nodes: [{ id: 'node_start', type: 'start' }, { id: 'node_msg', type: 'message' }],
            edges: [{ source: 'node_start', target: 'node_msg' }]
          })
      });

      const res = await request(app)
        .post(`/api/developer/v1/automations/flows/${FLOW_A_ID}/trigger`)
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .send({ contactPhone: '+919876543210', dryRun: true })
        .expect(200);

      expect(res.body.data.dryRun).toBe(true);
      expect(res.body.data.startNodeId).toBe('node_start');
    });

    test('POST /api/developer/v1/webhooks/subscriptions blocks SSRF metadata targets and creates valid subscriptions', async () => {
      const ssrfRes = await request(app)
        .post('/api/developer/v1/webhooks/subscriptions')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .send({
          name: 'SSRF Attempt',
          targetUrl: 'http://169.254.169.254/latest/meta-data/',
          events: ['lead.created']
        })
        .expect(400);

      expect(ssrfRes.body.error.code).toBe('INVALID_TARGET_URL');

      jest.spyOn(WebhookSubscription, 'create').mockImplementation(async (doc) => ({
        _id: SUB_A_ID,
        ...doc,
        toObject() {
          return { _id: SUB_A_ID, ...doc };
        }
      }));

      const validRes = await request(app)
        .post('/api/developer/v1/webhooks/subscriptions')
        .set('X-Developer-Client-Id', process.env.DEVELOPER_MGMT_CLIENT_ID)
        .set('X-Developer-Client-Secret', process.env.DEVELOPER_MGMT_CLIENT_SECRET)
        .set('X-Organization-Id', ORG_A_ID)
        .send({
          name: 'CRM Lead Sync Webhook',
          targetUrl: 'https://webhooks.partner.example.com/graxion',
          events: ['lead.created', 'deal.stage_changed']
        })
        .expect(201);

      expect(validRes.body.data.subscription.signingSecret).toMatch(/^whsec_/);
      expect(validRes.body.data.subscription.events).toEqual(['lead.created', 'deal.stage_changed']);
    });
  });

  // ─── 5. EXISTING FLOW COMPATIBILITY & AUDIT REMEDIATIONS ───────────────────
  describe('5. Existing Flow Compatibility & Audit Security Remediations', () => {
    test('Dashboard mutating endpoints still strictly enforce CSRF token protection', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .send({ name: 'Test', phone: '+919876543210' })
        .expect(403);

      expect(res.body.message).toMatch(/CSRF token missing/i);
    });

    test('E-commerce webhook rejects unsigned requests (401) and accepts valid HMAC-SHA256 requests', async () => {
      // 1. Unsigned request -> 401
      await request(app)
        .post(`/api/webhooks/ecommerce/${ORG_A_ID}/abandoned-cart`)
        .send({ phone: '+919876543210', email: 'buyer@example.com' })
        .expect(401);

      // 2. Signed request with valid HMAC -> 200
      jest.spyOn(Integration, 'findOne').mockReturnValue({
        lean: () => Promise.resolve(null)
      });
      jest.spyOn(Organization, 'findById').mockResolvedValue({ _id: ORG_A_ID, name: 'Workspace Alpha' });
      jest.spyOn(Contact, 'findOne').mockResolvedValue({
        _id: CONTACT_A_ID,
        organization: ORG_A_ID,
        phone: '919876543210',
        timeline: [],
        save: jest.fn().mockResolvedValue(true)
      });

      const bodyObj = { phone: '+919876543210', email: 'buyer@example.com', line_items: [] };
      const rawPayload = JSON.stringify(bodyObj);
      const validHmac = crypto
        .createHmac('sha256', process.env.ECOMMERCE_WEBHOOK_SECRET)
        .update(rawPayload, 'utf8')
        .digest('base64');

      const signedRes = await request(app)
        .post(`/api/webhooks/ecommerce/${ORG_A_ID}/abandoned-cart`)
        .set('Content-Type', 'application/json')
        .set('X-Shopify-Hmac-Sha256', validHmac)
        .send(rawPayload)
        .expect(200);

      expect(signedRes.body.status).toBe('success');
    });
  });
});
