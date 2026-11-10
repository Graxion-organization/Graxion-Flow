/**
 * Graxion Flow — Critical Bug Fix & Centralized Admin Error Logging Test Suite
 *
 * Verifies all 12 required production reliability scenarios:
 * 1. Valid WhatsApp text message saves message and updates conversation
 * 2. WhatsApp payload containing both statuses and messages processes both
 * 3. Multiple incoming messages in one payload are all processed
 * 4. Active AI agent generates and sends a WhatsApp reply
 * 5. Inactive or missing AI agent still saves the incoming message in the Inbox
 * 6. AI provider failure logs an error in Admin Logs and allows retry
 * 7. Outbound WhatsApp API failure logs an error in Admin Logs and does not corrupt Inbox state
 * 8. Duplicate webhook does not create duplicate messages or duplicate AI replies (and resumes if previous AI attempt failed)
 * 9. Socket event is emitted for new incoming and outgoing messages
 * 10. API/service/database/queue errors are saved to Admin Logs
 * 11. Sensitive values are redacted from Admin Logs
 * 12. Non-admin users cannot access Admin Logs
 */

process.env.JWT_SECRET = 'test-secret-key-for-graxion';
process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';

jest.mock('../src/utils/socket', () => ({
  emitToUser: jest.fn(),
  emitNotification: jest.fn(),
  emitToRoom: jest.fn(),
}));

jest.mock('../src/utils/creditHelper', () => ({
  deductCredits: jest.fn().mockResolvedValue(true),
  logTransaction: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/dealAutomationService', () => ({
  analyzeAndAutoUpdateDeal: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/flowEngine', () => ({
  handleIncomingMessage: jest.fn().mockResolvedValue(false),
}));

jest.mock('../src/utils/keywordMatcher', () => ({
  checkKeywordMatch: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/services/conversationPricingService', () => ({
  processPricingWebhook: jest.fn().mockResolvedValue(true),
}));

const SystemErrorLog = require('../src/models/SystemErrorLog');
const logger = require('../src/utils/logger');
const socket = require('../src/utils/socket');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const WhatsappAccount = require('../src/models/WhatsappAccount');
const Agent = require('../src/models/Agent');
const User = require('../src/models/User');
const Contact = require('../src/models/Contact');
const Plan = require('../src/models/Plan');
const BroadcastMessage = require('../src/models/BroadcastMessage');
const WhatsAppService = require('../src/services/whatsappService');
const OrchestrationEngine = require('../src/services/orchestrationEngine');
const webhookController = require('../src/controllers/webhookController');
const adminController = require('../src/controllers/adminController');
const { restrictTo } = require('../src/middleware/auth');
const errorHandler = require('../src/middleware/errorHandler');

describe('Graxion Flow — Critical Bug Fix & Centralized Admin Error Logging (12 Scenarios)', () => {
  const dummyUserId = '650c1f1e1c9d440000b11111';
  const dummyOrgId = '650c1f1e1c9d440000b22222';
  const dummyAccountId = '650c1f1e1c9d440000b33333';
  const dummyAgentId = '650c1f1e1c9d440000b44444';
  const phoneNumberId = '109988776655';

  let mockAccount;
  let mockAgent;
  let mockUser;
  let recordedAdminLogs;

  beforeEach(() => {
    jest.clearAllMocks();
    recordedAdminLogs = [];

    // Spy on SystemErrorLog.findOneAndUpdate so logger.recordAdminLog persists to recordedAdminLogs in memory
    jest.spyOn(SystemErrorLog, 'findOneAndUpdate').mockImplementation((filter, update) => {
      const entry = {
        _id: `err_${recordedAdminLogs.length + 1}`,
        message: filter.message,
        ...(update.$setOnInsert || {}),
        ...(update.$set || {}),
        count: 1,
      };
      recordedAdminLogs.push(entry);
      return Promise.resolve(entry);
    });

    const { encrypt } = require('../src/utils/encryption');
    mockAccount = {
      _id: dummyAccountId,
      phoneNumberId,
      status: 'connected',
      isActive: true,
      user: dummyUserId,
      organization: dummyOrgId,
      accessToken: encrypt('EAABs0SecretMetaAccessToken999999999'),
    };

    mockAgent = {
      _id: dummyAgentId,
      name: 'Graxion Production AI Agent',
      organization: dummyOrgId,
      isActive: true,
      contextWindow: 10,
      businessHours: { enabled: false },
    };

    mockUser = {
      _id: dummyUserId,
      organization: dummyOrgId,
      subscription: { plan: 'pro', credits: 100 },
      usage: { messagesThisMonth: 5 },
      getPlanLimits: jest.fn().mockResolvedValue({ messages: 5000 }),
    };

    jest.spyOn(Contact, 'findOne').mockResolvedValue(null);
    jest.spyOn(Plan, 'findOne').mockResolvedValue({ agentMsgCreditCost: 1 });
    jest.spyOn(BroadcastMessage, 'findOne').mockResolvedValue(null);

    jest.spyOn(WhatsappAccount, 'findOne').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(mockAccount),
    }));

    jest.spyOn(User, 'findById').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(mockUser),
    }));

    jest.spyOn(Agent, 'findOne').mockResolvedValue(mockAgent);
    jest.spyOn(Agent, 'find').mockResolvedValue([mockAgent]);
    jest.spyOn(Agent, 'findByIdAndUpdate').mockResolvedValue(mockAgent);

    jest.spyOn(WhatsAppService.prototype, 'sendTextMessage').mockResolvedValue({
      messages: [{ id: `wamid.out_${Date.now()}` }],
    });
    jest.spyOn(WhatsAppService.prototype, 'markAsRead').mockResolvedValue({ success: true });

    jest.spyOn(OrchestrationEngine, 'execute').mockResolvedValue({
      content: 'Welcome to Graxion Flow! How can we assist you?',
      tokensUsed: 22,
      responseTime: 95,
      agent: mockAgent,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1 & 4 & 9. Valid WhatsApp text message saves message, updates conversation, triggers active AI reply, and emits Socket events', async () => {
    const fromPhone = '16505559001';
    const messageId = `wamid.scen1_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: 'Alice Customer' }, wa_id: fromPhone }],
            messages: [{
              from: fromPhone,
              id: messageId,
              timestamp: '1700000100',
              type: 'text',
              text: { body: 'Hi, I need pricing info' },
            }],
          },
        }],
      }],
    };

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00001',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      customerName: 'Alice Customer',
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    jest.spyOn(Conversation, 'create').mockResolvedValue(mockConv);
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // 1. Customer message saved
    expect(messages.length).toBe(2);
    expect(messages[0]).toMatchObject({
      role: 'user',
      content: 'Hi, I need pricing info',
      waMessageId: messageId,
      processingStatus: 'completed',
    });

    // 4. Active AI agent reply sent & saved
    expect(WhatsAppService.prototype.sendTextMessage).toHaveBeenCalledWith(
      fromPhone,
      'Welcome to Graxion Flow! How can we assist you?'
    );
    expect(messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Welcome to Graxion Flow! How can we assist you?',
      status: 'sent',
    });

    // 9. Socket events emitted for incoming customer message and outgoing AI reply
    expect(socket.emitToUser).toHaveBeenCalledWith(
      dummyUserId,
      'conversation_updated',
      expect.objectContaining({
        conversationId: mockConv._id,
        platform: 'whatsapp',
      }),
      dummyOrgId
    );
    expect(socket.emitNotification).toHaveBeenCalledWith(
      dummyUserId,
      expect.objectContaining({
        type: 'new_message',
        conversationId: mockConv._id,
      }),
      dummyOrgId
    );
  });

  test('2. WhatsApp payload containing BOTH statuses and messages processes both without dropping incoming message', async () => {
    const fromPhone = '16505559002';
    const statusMsgId = `wamid.status_${Date.now()}`;
    const incomingMsgId = `wamid.incoming_${Date.now()}`;

    const combinedPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: phoneNumberId },
            statuses: [{
              id: statusMsgId,
              status: 'read',
              timestamp: '1700000200',
              recipient_id: fromPhone,
            }],
            contacts: [{ profile: { name: 'Bob Combined' }, wa_id: fromPhone }],
            messages: [{
              from: fromPhone,
              id: incomingMsgId,
              timestamp: '1700000201',
              type: 'text',
              text: { body: 'Incoming message in same payload as status' },
            }],
          },
        }],
      }],
    };

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00002',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      customerName: 'Bob Combined',
      status: 'active',
      messageCount: 1,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Message, 'findOneAndUpdate').mockResolvedValue({
      _id: 'msg_old_status',
      waMessageId: statusMsgId,
      conversationId: mockConv._id,
      status: 'read',
    });
    jest.spyOn(Conversation, 'findById').mockResolvedValue(mockConv);
    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockConv) });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(combinedPayload);

    // Verify status update was processed
    expect(Message.findOneAndUpdate).toHaveBeenCalledWith(
      { waMessageId: statusMsgId },
      { $set: { status: 'read' } },
      { new: true }
    );

    // Verify incoming message in the SAME payload was ALSO processed and replied to
    expect(messages.some((m) => m.role === 'user' && m.waMessageId === incomingMsgId)).toBe(true);
    expect(messages.some((m) => m.role === 'assistant')).toBe(true);
  });

  test('3. Multiple incoming messages across multiple entries/changes in one payload are all processed', async () => {
    const msgId1 = `wamid.multi1_${Date.now()}`;
    const msgId2 = `wamid.multi2_${Date.now()}`;
    const multiPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_1',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: phoneNumberId },
              contacts: [
                { profile: { name: 'User One' }, wa_id: '16505559031' },
                { profile: { name: 'User Two' }, wa_id: '16505559032' },
              ],
              messages: [
                {
                  from: '16505559031',
                  id: msgId1,
                  timestamp: '1700000301',
                  type: 'text',
                  text: { body: 'First batched message' },
                },
                {
                  from: '16505559032',
                  id: msgId2,
                  timestamp: '1700000302',
                  type: 'text',
                  text: { body: 'Second batched message' },
                },
              ],
            },
          }],
        },
      ],
    };

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00003',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: '16505559031',
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockConv) });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(multiPayload);

    const userMsgs = messages.filter((m) => m.role === 'user');
    expect(userMsgs.length).toBe(2);
    expect(userMsgs[0].content).toBe('First batched message');
    expect(userMsgs[1].content).toBe('Second batched message');
  });

  test('5. Inactive or missing AI agent still saves the incoming message in the Inbox', async () => {
    const fromPhone = '16505559005';
    const messageId = `wamid.noagent_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: 'No Agent Customer' }, wa_id: fromPhone }],
            messages: [{
              from: fromPhone,
              id: messageId,
              timestamp: '1700000500',
              type: 'text',
              text: { body: 'Is anyone there?' },
            }],
          },
        }],
      }],
    };

    jest.spyOn(Agent, 'findOne').mockResolvedValue(null);
    jest.spyOn(Agent, 'find').mockResolvedValue([]);

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00005',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockConv) });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Is anyone there?');
    expect(messages[0].processingStatus).toBe('skipped');
    expect(OrchestrationEngine.execute).not.toHaveBeenCalled();
  });

  test('6 & 8. AI provider failure logs error in Admin Logs, marks message failed, and allows retry/duplicate webhook to resume AI without duplicating customer message', async () => {
    const fromPhone = '16505559006';
    const messageId = `wamid.airetry_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: 'Retry Customer' }, wa_id: fromPhone }],
            messages: [{
              from: fromPhone,
              id: messageId,
              timestamp: '1700000600',
              type: 'text',
              text: { body: 'Please help me with my order' },
            }],
          },
        }],
      }],
    };

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00006',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockConv) });
    jest.spyOn(Message, 'findOne').mockImplementation(async ({ waMessageId }) => {
      return messages.find((m) => m.waMessageId === waMessageId) || null;
    });

    // Attempt 1: AI provider throws error (with throwOnError: true as used by BullMQ worker)
    jest.spyOn(OrchestrationEngine, 'execute').mockRejectedValueOnce(new Error('OpenAI 503 Service Unavailable'));

    await expect(
      webhookController.processWebhookPayload(payload, { throwOnError: true, retryAttempt: 1 })
    ).rejects.toThrow('OpenAI 503 Service Unavailable');

    // Customer message was saved once with processingStatus = 'failed'
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].processingStatus).toBe('failed');

    // Admin Log recorded the AI failure
    expect(recordedAdminLogs.some((l) => l.message.includes('[AI_ORCHESTRATION_FAILED]'))).toBe(true);

    // Attempt 2 (Retry or duplicate webhook): AI succeeds!
    jest.spyOn(OrchestrationEngine, 'execute').mockResolvedValueOnce({
      content: 'Your order #1024 is out for delivery!',
      tokensUsed: 18,
      responseTime: 80,
      agent: mockAgent,
    });

    await webhookController.processWebhookPayload(payload, { throwOnError: true, retryAttempt: 2 });

    // Customer message was NOT duplicated (still only 1 user message + 1 assistant message = 2 total)
    const userMsgs = messages.filter((m) => m.role === 'user');
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    expect(userMsgs.length).toBe(1);
    expect(assistantMsgs.length).toBe(1);
    expect(assistantMsgs[0].content).toBe('Your order #1024 is out for delivery!');
    expect(userMsgs[0].processingStatus).toBe('completed');

    // Attempt 3 (Subsequent duplicate webhook after completion): skipped completely
    await webhookController.processWebhookPayload(payload);
    expect(messages.length).toBe(2);
    expect(WhatsAppService.prototype.sendTextMessage).toHaveBeenCalledTimes(1);
  });

  test('7. Outbound WhatsApp API failure logs structured error in Admin Logs and does not corrupt Inbox state', async () => {
    const fromPhone = '16505559007';
    const messageId = `wamid.outfail_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_1',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: phoneNumberId },
            contacts: [{ profile: { name: 'Outbound Fail Test' }, wa_id: fromPhone }],
            messages: [{
              from: fromPhone,
              id: messageId,
              timestamp: '1700000700',
              type: 'text',
              text: { body: 'Test outbound failure' },
            }],
          },
        }],
      }],
    };

    const metaErr = new Error('Meta API rate limit reached');
    metaErr.response = { status: 429, data: { error: { code: 130429, message: 'Rate limit hit' } } };
    jest.spyOn(WhatsAppService.prototype, 'sendTextMessage').mockRejectedValue(metaErr);

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000c00007',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (data) => {
        const doc = { _id: `msg_${messages.length + 1}`, ...data, save: jest.fn().mockResolvedValue(true) };
        messages.push(doc);
        return doc;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockConv) });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // User message is preserved, no fake assistant message added
    expect(messages.length).toBe(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].processingStatus).toBe('failed');

    // Structured error saved in Admin Logs
    const metaLog = recordedAdminLogs.find((l) => l.message.includes('[META_SEND_FAILED]'));
    expect(metaLog).toBeDefined();
    expect(metaLog.service).toBe('whatsappService');
    expect(metaLog.provider).toBe('whatsapp');
    expect(metaLog.statusCode).toBe(429);
    expect(metaLog.errorCode).toBe('130429');
  });

  test('10 & 11. Express API/service errors are saved to Admin Logs and sensitive secrets/tokens/passwords are strictly redacted', async () => {
    const err = new Error(
      'Auth failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload.sig and key sk-proj-1234567890abcdefghijklmnop'
    );
    err.statusCode = 502;
    err.code = 'PROVIDER_AUTH_ERR';

    const req = {
      id: 'req-998877',
      originalUrl: '/api/whatsapp/connect?access_token=EAABs0SuperSecretToken123456789',
      method: 'POST',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'JestTestAgent',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret.sig',
      },
      user: { _id: dummyUserId, organization: dummyOrgId },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    // Also log a direct error with sensitive nested fields
    logger.error('Redis connection failed at redis://default:MySecretRedisPass123@redis.host.com:6379', {
      service: 'redis',
      accessToken: 'EAABs0SuperSecretMetaToken',
      apiKey: 'sk-1234567890abcdefghijklmnop',
      password: 'SuperSecretPassword!',
      authorization: 'Bearer my-secret-jwt-token-value',
    });

    expect(recordedAdminLogs.length).toBeGreaterThanOrEqual(2);

    const serializedLogs = JSON.stringify(recordedAdminLogs);
    expect(serializedLogs).not.toContain('EAABs0SuperSecretToken123456789');
    expect(serializedLogs).not.toContain('EAABs0SuperSecretMetaToken');
    expect(serializedLogs).not.toContain('sk-proj-1234567890abcdefghijklmnop');
    expect(serializedLogs).not.toContain('sk-1234567890abcdefghijklmnop');
    expect(serializedLogs).not.toContain('MySecretRedisPass123');
    expect(serializedLogs).not.toContain('SuperSecretPassword!');
    expect(serializedLogs).not.toContain('my-secret-jwt-token-value');
    expect(serializedLogs).toContain('***REDACTED***');
  });

  test('12. Non-admin users cannot access Admin Logs (403), while Admin users can filter and search logs (200)', async () => {
    const adminGuard = restrictTo('admin', 'superadmin');

    // 1. Verify non-admin user is rejected by restrictTo('admin', 'superadmin') middleware
    const nonAdminReq = { user: { _id: dummyUserId, role: 'user' } };
    const nonAdminRes = {};
    const nonAdminNext = jest.fn();

    adminGuard(nonAdminReq, nonAdminRes, nonAdminNext);
    expect(nonAdminNext).toHaveBeenCalledTimes(1);
    const passedError = nonAdminNext.mock.calls[0][0];
    expect(passedError).toBeDefined();
    expect(passedError.statusCode).toBe(403);

    // 2. Verify admin user passes restrictTo('admin', 'superadmin') middleware and can query getErrorLogs with filters
    const adminReq = {
      user: { _id: dummyUserId, role: 'admin' },
      query: {
        severity: 'error',
        service: 'whatsappService',
        resolved: 'false',
        search: 'META_SEND_FAILED',
        page: '1',
        limit: '10',
      },
    };
    const adminNext = jest.fn();
    adminGuard(adminReq, {}, adminNext);
    expect(adminNext).toHaveBeenCalledWith();

    const mockLogChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'log_1',
          level: 'error',
          severity: 'error',
          service: 'whatsappService',
          provider: 'whatsapp',
          message: '[META_SEND_FAILED] Meta send API request failed',
          errorCode: '130429',
          statusCode: 429,
          count: 3,
          resolved: false,
        },
      ]),
    };

    jest.spyOn(SystemErrorLog, 'find').mockReturnValue(mockLogChain);
    jest.spyOn(SystemErrorLog, 'countDocuments').mockResolvedValue(1);

    const adminRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await adminController.getErrorLogs(adminReq, adminRes, jest.fn());

    expect(SystemErrorLog.find).toHaveBeenCalledWith(
      expect.objectContaining({
        resolved: false,
        $and: expect.any(Array),
      })
    );
    expect(adminRes.status).toHaveBeenCalledWith(200);
    expect(adminRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              service: 'whatsappService',
              errorCode: '130429',
              count: 3,
            }),
          ]),
        }),
      })
    );
  });

  test('13. getErrorLogs serializes BSON ObjectId _id as string and resolveErrorLog handles graxion-proxy-admin and invalid IDs without 500 CastError', async () => {
    const mongoose = require('mongoose');
    const bsonId = new mongoose.Types.ObjectId('650c1f1e1c9d440000c00999');

    const mockLogChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: bsonId,
          level: 'error',
          severity: 'ERROR',
          service: 'api',
          message: 'Test ObjectId serialization',
          resolved: false,
        },
      ]),
    };

    jest.spyOn(SystemErrorLog, 'find').mockReturnValue(mockLogChain);
    jest.spyOn(SystemErrorLog, 'countDocuments').mockResolvedValue(1);

    const getRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await adminController.getErrorLogs({ query: {} }, getRes, jest.fn());

    const returnedLogs = getRes.json.mock.calls[0][0].data.logs;
    expect(typeof returnedLogs[0]._id).toBe('string');
    expect(returnedLogs[0]._id).toBe('650c1f1e1c9d440000c00999');

    // Resolve with graxion-proxy-admin (non-ObjectId user._id)
    jest.spyOn(SystemErrorLog, 'findByIdAndUpdate').mockResolvedValue({
      _id: '650c1f1e1c9d440000c00999',
      resolved: true,
      resolvedBy: null,
    });

    const resolveRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await adminController.resolveErrorLog(
      {
        params: { id: '650c1f1e1c9d440000c00999' },
        body: { resolved: true },
        user: { _id: 'graxion-proxy-admin', role: 'superadmin' },
      },
      resolveRes,
      jest.fn()
    );

    expect(SystemErrorLog.findByIdAndUpdate).toHaveBeenCalledWith(
      '650c1f1e1c9d440000c00999',
      expect.objectContaining({ resolved: true, resolvedBy: null }),
      { new: true }
    );
    expect(resolveRes.status).toHaveBeenCalledWith(200);

    // Invalid "[object Object]" ID returns 400 cleanly instead of throwing 500 CastError
    const badRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await adminController.resolveErrorLog(
      {
        params: { id: '[object Object]' },
        body: { resolved: true },
        user: { _id: 'graxion-proxy-admin' },
      },
      badRes,
      jest.fn()
    );
    expect(badRes.status).toHaveBeenCalledWith(400);
  });

  test('14. Unauthenticated 401 on /api/organizations does not pollute SystemErrorLog', async () => {
    const err = new Error('You are not logged in. Please log in to access.');
    err.statusCode = 401;
    err.status = 'fail';
    err.isOperational = true;

    const req = {
      originalUrl: '/api/organizations',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    const countBefore = recordedAdminLogs.length;
    errorHandler(err, req, res, jest.fn());
    expect(recordedAdminLogs.length).toBe(countBefore);
  });

  test('15. GET /api/whatsapp returns connected WhatsApp accounts for authenticated user without being intercepted by webhook verifyWebhook', async () => {
    const waController = require('../controllers/whatsappController');
    jest.spyOn(WhatsappAccount, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: dummyWaAccountId,
            phoneNumberId,
            displayPhoneNumber: '+1 555-0199',
            verifiedName: 'Graxion Support',
            status: 'pending',
            isActive: true,
          },
        ]),
      }),
    });

    const req = {
      organization: { _id: dummyOrgId },
      user: { _id: dummyUserId, currentOrganization: dummyOrgId },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await waController.getAccounts(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.accounts.length).toBe(1);
    expect(body.data.accounts[0].status).toBe('connected');
  });
});

