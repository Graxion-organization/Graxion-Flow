/**
 * Webhook Lifecycle & Inbox Pipeline Automated Test Suite
 *
 * Scenarios tested:
 * 1. First inbound message creates a conversation and appears in the inbox.
 * 2. Existing conversation receives a new message.
 * 3. Missing agent does not prevent customer message persistence.
 * 4. AI routing failure is observable and preserves the message.
 * 5. Successful AI generation sends and persists exactly one reply.
 * 6. Meta send failure is logged and does not create a false sent record.
 * 7. Duplicate webhook does not duplicate messages or replies.
 * 8. Status-only webhook events do not become customer messages.
 */

// Environment setup
process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';

// Mocks
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

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

const logger = require('../src/utils/logger');
const socket = require('../src/utils/socket');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const WhatsappAccount = require('../src/models/WhatsappAccount');
const Agent = require('../src/models/Agent');
const User = require('../src/models/User');
const WhatsAppService = require('../src/services/whatsappService');
const OrchestrationEngine = require('../src/services/orchestrationEngine');
const webhookController = require('../src/controllers/webhookController');

// Helper to construct Meta webhook payloads
function createMetaPayload({
  from = '16505551234',
  phoneNumberId = '1099887766',
  messageId = `wamid.${Date.now()}_${Math.random()}`,
  text = 'Hello Graxion',
  type = 'text',
  isStatus = false,
  status = 'delivered',
} = {}) {
  if (isStatus) {
    return {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '1234567890', phone_number_id: phoneNumberId },
            statuses: [{
              id: messageId,
              status,
              timestamp: '1700000000',
              recipient_id: from,
            }]
          }
        }]
      }]
    };
  }

  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WABA_ID',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '1234567890', phone_number_id: phoneNumberId },
          contacts: [{ profile: { name: 'Customer Test' }, wa_id: from }],
          messages: [{
            from,
            id: messageId,
            timestamp: '1700000000',
            type,
            text: { body: text },
          }]
        }
      }]
    }]
  };
}

describe('Graxion Flow - Webhook Lifecycle & Inbox Verification', () => {
  const dummyUserId = '650c1f1e1c9d440000a11111';
  const dummyOrgId = '650c1f1e1c9d440000a22222';
  const dummyAccountId = '650c1f1e1c9d440000a33333';
  const dummyAgentId = '650c1f1e1c9d440000a44444';
  const phoneNumberId = '1099887766';

  let mockAccount;
  let mockAgent;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    const { encrypt } = require('../src/utils/encryption');
    mockAccount = {
      _id: dummyAccountId,
      phoneNumberId,
      status: 'connected',
      isActive: true,
      user: dummyUserId,
      organization: dummyOrgId,
      accessToken: encrypt('test-valid-access-token'),
    };

    mockAgent = {
      _id: dummyAgentId,
      name: 'Graxion Support Bot',
      organization: dummyOrgId,
      isActive: true,
      contextWindow: 10,
      businessHours: { enabled: false },
    };

    mockUser = {
      _id: dummyUserId,
      organization: dummyOrgId,
      subscription: { plan: 'pro', credits: 100 },
      usage: { messagesThisMonth: 10 },
      getPlanLimits: jest.fn().mockResolvedValue({ messages: 1000 }),
    };

    const Contact = require('../src/models/Contact');
    jest.spyOn(Contact, 'findOne').mockResolvedValue(null);

    const Plan = require('../src/models/Plan');
    jest.spyOn(Plan, 'findOne').mockResolvedValue({ agentMsgCreditCost: 1 });

    const BroadcastMessage = require('../src/models/BroadcastMessage');
    jest.spyOn(BroadcastMessage, 'findOne').mockResolvedValue(null);

    // Default Spies
    jest.spyOn(WhatsappAccount, 'findOne').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(mockAccount),
    }));

    jest.spyOn(User, 'findById').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(mockUser),
    }));

    jest.spyOn(Agent, 'findOne').mockResolvedValue(mockAgent);
    jest.spyOn(Agent, 'find').mockResolvedValue([mockAgent]);
    jest.spyOn(Agent, 'findByIdAndUpdate').mockResolvedValue(mockAgent);

    // Mock WhatsAppService methods on prototype
    jest.spyOn(WhatsAppService.prototype, 'sendTextMessage').mockResolvedValue({
      messages: [{ id: `wamid.out_${Date.now()}` }],
    });
    jest.spyOn(WhatsAppService.prototype, 'markAsRead').mockResolvedValue({ success: true });

    // Mock OrchestrationEngine
    jest.spyOn(OrchestrationEngine, 'execute').mockResolvedValue({
      content: 'Hello, how can I help you today?',
      tokensUsed: 15,
      responseTime: 120,
      agent: mockAgent,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. First inbound message creates a conversation and appears in the inbox', async () => {
    const fromPhone = '16505550001';
    const messageId = `wamid.test_first_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Hello for first time' });

    // Simulate no existing conversation
    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const messagesAdded = [];
    const mockCreatedConversation = {
      _id: '650c1f1e1c9d440000conv1',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      customerName: 'Customer Test',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        const msg = { _id: `msg_${messagesAdded.length + 1}`, ...msgData };
        messagesAdded.push(msg);
        mockCreatedConversation.messageCount += 1;
        return msg;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'create').mockResolvedValue(mockCreatedConversation);
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Verify conversation was created
    expect(Conversation.create).toHaveBeenCalledTimes(1);
    expect(Conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerPhone: fromPhone,
        status: 'active',
      })
    );

    // Verify customer message was persisted before AI response
    expect(messagesAdded.length).toBeGreaterThanOrEqual(1);
    expect(messagesAdded[0]).toMatchObject({
      role: 'user',
      content: 'Hello for first time',
      waMessageId: messageId,
    });

    // Verify inbox real-time update was emitted
    expect(socket.emitToUser).toHaveBeenCalledWith(
      dummyUserId,
      'conversation_updated',
      expect.objectContaining({
        conversationId: mockCreatedConversation._id,
      }),
      dummyOrgId
    );
  });

  test('2. Existing conversation receives a new message', async () => {
    const fromPhone = '16505550002';
    const messageId = `wamid.test_existing_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Second message in conversation' });

    const existingMessages = [
      { role: 'user', content: 'First message', waMessageId: 'wamid.first' },
      { role: 'assistant', content: 'First reply', waMessageId: 'wamid.reply' },
    ];

    const mockExistingConversation = {
      _id: '650c1f1e1c9d440000conv2',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 2,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        const msg = { _id: `msg_${existingMessages.length + 1}`, ...msgData };
        existingMessages.push(msg);
        return msg;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...existingMessages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockExistingConversation),
    });
    jest.spyOn(Conversation, 'create').mockResolvedValue(null);
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Verify existing conversation was reused, Conversation.create was NOT called
    expect(Conversation.create).not.toHaveBeenCalled();
    expect(mockExistingConversation.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Second message in conversation',
        waMessageId: messageId,
      })
    );
  });

  test('3. Missing agent does not prevent customer message persistence', async () => {
    const fromPhone = '16505550003';
    const messageId = `wamid.test_no_agent_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Message with no agent online' });

    // Simulate no agent found anywhere
    jest.spyOn(Agent, 'findOne').mockResolvedValue(null);
    jest.spyOn(Agent, 'find').mockResolvedValue([]);

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000conv3',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        messages.push(msgData);
        return msgData;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockConv),
    });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Verify customer message was saved to database
    expect(mockConv.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Message with no agent online',
        waMessageId: messageId,
      })
    );

    // Verify warning logged with explicit code NO_ACTIVE_AGENT
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[ROUTING_NO_AGENT]'),
      expect.objectContaining({ reason: 'NO_ACTIVE_AGENT' })
    );

    // Verify AI was not invoked
    expect(OrchestrationEngine.execute).not.toHaveBeenCalled();
  });

  test('4. AI routing failure is observable and preserves the message', async () => {
    const fromPhone = '16505550004';
    const messageId = `wamid.test_ai_failure_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Trigger AI error' });

    // Simulate AI orchestration failure
    jest.spyOn(OrchestrationEngine, 'execute').mockRejectedValue(new Error('LLM model quota exceeded'));

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000conv4',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        messages.push(msgData);
        return msgData;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockConv),
    });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Customer message is preserved
    expect(mockConv.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Trigger AI error',
      })
    );

    // Assistant message is NOT fabricated
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBe(0);

    // Error is logged with diagnostic context
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AI_ORCHESTRATION_FAILED]'),
      expect.objectContaining({ reason: 'AI_ORCHESTRATION_ERROR' })
    );
  });

  test('5. Successful AI generation sends and persists exactly one reply', async () => {
    const fromPhone = '16505550005';
    const messageId = `wamid.test_success_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'What are your store hours?' });

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000conv5',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      totalMessages: 0,
      totalTokensUsed: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        messages.push(msgData);
        return msgData;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockConv),
    });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Customer message saved
    expect(mockConv.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'What are your store hours?' })
    );

    // Exactly one reply sent to Meta API
    expect(WhatsAppService.prototype.sendTextMessage).toHaveBeenCalledTimes(1);
    expect(WhatsAppService.prototype.sendTextMessage).toHaveBeenCalledWith(
      fromPhone,
      'Hello, how can I help you today?'
    );

    // Exactly one assistant message saved
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBe(1);
    expect(assistantMessages[0].content).toBe('Hello, how can I help you today?');
    expect(assistantMessages[0].status).toBe('sent');
  });

  test('6. Meta send failure is logged and does not create a false sent record', async () => {
    const fromPhone = '16505550006';
    const messageId = `wamid.test_send_fail_${Date.now()}`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Hello will this fail send?' });

    // Simulate Meta API 400 error
    const metaError = new Error('Invalid OAuth access token');
    metaError.response = { status: 400, data: { error: { code: 190, message: 'Invalid OAuth access token' } } };
    jest.spyOn(WhatsAppService.prototype, 'sendTextMessage').mockRejectedValue(metaError);

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000conv6',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        messages.push(msgData);
        return msgData;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockConv),
    });
    jest.spyOn(Message, 'findOne').mockResolvedValue(null);

    await webhookController.processWebhookPayload(payload);

    // Customer message was persisted
    expect(mockConv.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Hello will this fail send?' })
    );

    // Assistant message was NOT persisted
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBe(0);

    // Error is logged with sanitized status and code
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[META_SEND_FAILED]'),
      expect.objectContaining({
        status: 400,
        errorCode: 190,
      })
    );
  });

  test('7. Duplicate webhook does not duplicate messages or replies', async () => {
    const fromPhone = '16505550007';
    const messageId = `wamid.dup_${Date.now()}_unique`;
    const payload = createMetaPayload({ from: fromPhone, messageId, text: 'Duplicate test' });

    // First time: message is not in DB
    jest.spyOn(Message, 'findOne').mockResolvedValueOnce(null);

    const messages = [];
    const mockConv = {
      _id: '650c1f1e1c9d440000conv7',
      user: dummyUserId,
      organization: dummyOrgId,
      customerPhone: fromPhone,
      status: 'active',
      messageCount: 0,
      addMessage: jest.fn().mockImplementation(async (msgData) => {
        messages.push(msgData);
        return msgData;
      }),
      getRecentMessages: jest.fn().mockImplementation(async () => [...messages]),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockConv),
    });

    // First execution: processed normally
    await webhookController.processWebhookPayload(payload);
    expect(mockConv.addMessage).toHaveBeenCalledTimes(2); // user + assistant

    // Second execution with same messageId: in-memory cache catches it
    await webhookController.processWebhookPayload(payload);

    // Should NOT call addMessage again
    expect(mockConv.addMessage).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[DEDUPLICATION_MEMORY_HIT]'),
      expect.anything()
    );
  });

  test('8. Status-only webhook events do not become customer messages', async () => {
    const statusPayload = createMetaPayload({
      messageId: 'wamid.status_target_123',
      isStatus: true,
      status: 'delivered',
    });

    const mockMsgDoc = {
      _id: 'msg_status_test',
      waMessageId: 'wamid.status_target_123',
      conversationId: '650c1f1e1c9d440000conv8',
      status: 'delivered',
    };

    const mockConv = {
      _id: '650c1f1e1c9d440000conv8',
      user: dummyUserId,
      organization: dummyOrgId,
      getRecentMessages: jest.fn().mockResolvedValue([mockMsgDoc]),
      addMessage: jest.fn(),
    };

    jest.spyOn(Message, 'findOneAndUpdate').mockResolvedValue(mockMsgDoc);
    jest.spyOn(Conversation, 'findById').mockResolvedValue(mockConv);
    jest.spyOn(Conversation, 'create').mockResolvedValue(null);

    await webhookController.processWebhookPayload(statusPayload);

    // Message status was updated in Message collection
    expect(Message.findOneAndUpdate).toHaveBeenCalledWith(
      { waMessageId: 'wamid.status_target_123' },
      { $set: { status: 'delivered' } },
      { new: true }
    );

    // Customer message was NOT created
    expect(mockConv.addMessage).not.toHaveBeenCalled();
    expect(Conversation.create).not.toHaveBeenCalled();

    // Inbox was notified of status update
    expect(socket.emitToUser).toHaveBeenCalledWith(
      dummyUserId,
      'conversation_updated',
      expect.objectContaining({ conversationId: mockConv._id }),
      dummyOrgId
    );
  });
});
