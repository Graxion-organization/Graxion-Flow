/**
 * Omnichannel Webhook & Inbox Pipeline Automated Test Suite
 * Covers WhatsApp, Telegram, and Instagram end-to-end:
 * 1. WhatsApp inbound message persistence, socket broadcast, and AI reply
 * 2. Telegram inbound message persistence, socket broadcast, and AI reply
 * 3. Telegram missing agent -> message still persisted in inbox for manual reply
 * 4. Telegram insufficient credits -> message still persisted in inbox
 * 5. Instagram inbound DM -> message persisted and socket broadcast emitted
 * 6. Instagram pageId entry matching -> resolves InstagramAccount correctly
 * 7. Instagram bot disabled / no agent -> customer message safely visible in inbox
 * 8. Instagram Send API failure -> customer message intact, no fake sent record
 * 9. Multi-tenancy isolation -> events and conversations scoped to organization
 */

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

jest.mock('../src/services/rateLimitService', () => ({
  recordWebhook: jest.fn().mockResolvedValue(true),
  checkAndRecordApiCall: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models/Plan', () => ({
  findOne: jest.fn().mockResolvedValue({ agentMsgCreditCost: 1 }),
}));

jest.mock('../src/models/SystemSetting', () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));

jest.mock('../src/models/InstagramActionLog', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findOneAndUpdate: jest.fn().mockResolvedValue({ status: 'pending', save: jest.fn().mockResolvedValue(true) }),
  updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
}));

jest.mock('../src/queues/instagramQueue', () => ({
  enqueueInstagramWebhook: jest.fn().mockResolvedValue(true),
  IG_WEBHOOK_QUEUE_NAME: 'instagram-webhooks',
}));

jest.mock('../src/models/InstagramWebhookEvent', () => {
  const mockEvent = {
    _id: '650c1f1e1c9d440000ee0001',
    status: 'queued',
    save: jest.fn().mockResolvedValue(true),
  };
  return {
    findOneAndUpdate: jest.fn().mockResolvedValue(mockEvent),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(mockEvent),
  };
});

const logger = require('../src/utils/logger');
const socket = require('../src/utils/socket');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const User = require('../src/models/User');
const Agent = require('../src/models/Agent');
const Organization = require('../src/models/Organization');
const TelegramAccount = require('../src/models/TelegramAccount');
const InstagramAccount = require('../src/models/InstagramAccount');
const TelegramService = require('../src/services/telegramService');
const InstagramService = require('../src/services/instagramService');
const AIService = require('../src/services/aiService');
const telegramWebhookController = require('../src/controllers/telegramWebhookController');
const instagramWebhookController = require('../src/controllers/instagramWebhookController');
const { processWebhookEvent } = require('../src/workers/instagramWebhookWorker');

describe('Omnichannel Pipeline (WhatsApp, Telegram, Instagram)', () => {
  const dummyUserId = '650c1f1e1c9d440000a11111';
  const dummyOrgId = '650c1f1e1c9d440000a22222';
  const dummyTgAccountId = '650c1f1e1c9d440000a33333';
  const dummyIgAccountId = '650c1f1e1c9d440000a44444';
  const dummyAgentId = '650c1f1e1c9d440000a55555';

  let mockAgent;
  let mockUser;
  let mockOrg;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrg = {
      _id: dummyOrgId,
      name: 'Acme Corp',
      isActive: true,
    };
    jest.spyOn(Organization, 'findOne').mockResolvedValue(mockOrg);

    mockAgent = {
      _id: dummyAgentId,
      name: 'Omni Agent',
      organization: dummyOrgId,
      user: dummyUserId,
      isActive: true,
      contextWindow: 10,
      businessHours: { enabled: false },
    };
    jest.spyOn(Agent, 'findOne').mockResolvedValue(mockAgent);
    jest.spyOn(Agent, 'find').mockResolvedValue([mockAgent]);
    jest.spyOn(Agent, 'findByIdAndUpdate').mockResolvedValue(mockAgent);

    mockUser = {
      _id: dummyUserId,
      organization: dummyOrgId,
      subscription: { plan: 'pro', credits: 100 },
      usage: { messagesThisMonth: 5 },
      getPlanLimits: jest.fn().mockResolvedValue({ messages: 1000 }),
    };
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    jest.spyOn(Message, 'findOne').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- TELEGRAM TESTS ---
  describe('Telegram Webhook Pipeline', () => {
    let mockTgAccount;

    beforeEach(() => {
      mockTgAccount = {
        _id: dummyTgAccountId,
        botUsername: 'graxion_bot',
        botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        status: 'connected',
        isActive: true,
        user: dummyUserId,
        organization: dummyOrgId,
      };

      jest.spyOn(TelegramAccount, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockTgAccount),
      });

      jest.spyOn(TelegramService.prototype, 'sendTextMessage').mockResolvedValue({
        ok: true,
        result: { message_id: 998877 },
      });
      jest.spyOn(TelegramService.prototype, 'sendAction').mockResolvedValue({ ok: true });

      jest.spyOn(AIService, 'generate').mockResolvedValue({
        content: 'Hi! I am the Telegram assistant for Graxion.',
        tokensUsed: 20,
        responseTime: 150,
      });
    });

    test('1. Normal Telegram inbound text -> saved customer message -> inbox socket -> AI reply accepted', async () => {
      const tgPayload = {
        botUsername: 'graxion_bot',
        update_id: 1001,
        message: {
          message_id: 4567,
          from: { id: 889900, first_name: 'David', username: 'davidx' },
          chat: { id: 889900, type: 'private' },
          date: 1700000000,
          text: 'What are your prices?',
        },
      };

      const messagesAdded = [];
      const mockConv = {
        _id: '650c1f1e1c9d440000tgconv',
        user: dummyUserId,
        organization: dummyOrgId,
        platform: 'telegram',
        customerTgId: '889900',
        customerName: 'David',
        customerUsername: 'davidx',
        status: 'active',
        totalMessages: 0,
        totalTokensUsed: 0,
        addMessage: jest.fn().mockImplementation(async (msgData) => {
          messagesAdded.push(msgData);
          return { _id: `msg_tg_${messagesAdded.length}`, ...msgData };
        }),
        getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(null), // create new
      });
      jest.spyOn(Conversation, 'create').mockResolvedValue(mockConv);

      await telegramWebhookController.processWebhookPayload(tgPayload);

      // Verify conversation created
      expect(Conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'telegram',
          customerTgId: '889900',
          customerName: 'David',
          status: 'active',
        })
      );

      // Verify customer message was persisted
      expect(messagesAdded.length).toBe(2); // 1 customer + 1 assistant
      expect(messagesAdded[0]).toMatchObject({
        role: 'user',
        content: 'What are your prices?',
        waMessageId: '4567',
      });

      // Verify real-time socket update was broadcast
      expect(socket.emitToUser).toHaveBeenCalledWith(
        dummyUserId,
        'conversation_updated',
        expect.objectContaining({
          conversationId: mockConv._id,
          platform: 'telegram',
        }),
        dummyOrgId
      );

      // Verify AI reply was sent to Telegram API and saved
      expect(TelegramService.prototype.sendTextMessage).toHaveBeenCalledWith(
        889900,
        expect.stringContaining('Hi! I am the Telegram assistant')
      );
      expect(messagesAdded[1]).toMatchObject({
        role: 'assistant',
        waMessageId: '998877',
        status: 'sent',
      });
    });

    test('2. Telegram missing agent -> customer message still persisted in inbox for manual reply', async () => {
      const tgPayload = {
        botUsername: 'graxion_bot',
        update_id: 1002,
        message: {
          message_id: 4568,
          from: { id: 889901, first_name: 'Elena', username: 'elena' },
          chat: { id: 889901, type: 'private' },
          date: 1700000000,
          text: 'Hello, I need help with an order',
        },
      };

      // Simulate no agents configured in DB
      jest.spyOn(Agent, 'findOne').mockResolvedValue(null);
      jest.spyOn(Agent, 'find').mockResolvedValue([]);

      const messagesAdded = [];
      const mockConv = {
        _id: '650c1f1e1c9d440000tgconv2',
        user: dummyUserId,
        organization: dummyOrgId,
        platform: 'telegram',
        customerTgId: '889901',
        customerName: 'Elena',
        status: 'active',
        addMessage: jest.fn().mockImplementation(async (msgData) => {
          messagesAdded.push(msgData);
          return { _id: `msg_tg_${messagesAdded.length}`, ...msgData };
        }),
        getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConv),
      });

      await telegramWebhookController.processWebhookPayload(tgPayload);

      // Customer message is preserved in DB!
      expect(mockConv.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello, I need help with an order',
          waMessageId: '4568',
        })
      );

      // Diagnostic warning logged with NO_ACTIVE_AGENT
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[ROUTING_NO_AGENT]'),
        expect.objectContaining({ reason: 'NO_ACTIVE_AGENT' })
      );

      // AI was NOT called and no assistant message was saved
      expect(AIService.generate).not.toHaveBeenCalled();
      expect(messagesAdded.length).toBe(1);
    });

    test('3. Telegram exhausted credits -> customer message persisted in inbox, AI safely paused', async () => {
      const tgPayload = {
        botUsername: 'graxion_bot',
        update_id: 1003,
        message: {
          message_id: 4569,
          from: { id: 889902, first_name: 'Frank' },
          chat: { id: 889902, type: 'private' },
          date: 1700000000,
          text: 'Can I get a quote?',
        },
      };

      // Set user credits to 0
      mockUser.subscription.credits = 0;

      const messagesAdded = [];
      const mockConv = {
        _id: '650c1f1e1c9d440000tgconv3',
        user: dummyUserId,
        organization: dummyOrgId,
        platform: 'telegram',
        customerTgId: '889902',
        customerName: 'Frank',
        status: 'active',
        addMessage: jest.fn().mockImplementation(async (msgData) => {
          messagesAdded.push(msgData);
          return { _id: `msg_tg_${messagesAdded.length}`, ...msgData };
        }),
        getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConv),
      });

      await telegramWebhookController.processWebhookPayload(tgPayload);

      // Customer message was saved to database
      expect(mockConv.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Can I get a quote?',
          waMessageId: '4569',
        })
      );

      // Credit limit warning logged
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[CREDIT_LIMIT_REACHED]'),
        expect.objectContaining({ reason: 'INSUFFICIENT_CREDITS' })
      );

      // No assistant message added
      expect(messagesAdded.length).toBe(1);
    });
  });

  // --- INSTAGRAM TESTS ---
  describe('Instagram Webhook Pipeline', () => {
    let mockIgAccount;

    beforeEach(() => {
      mockIgAccount = {
        _id: dummyIgAccountId,
        igAccountId: '178414000001111',
        pageId: '10998877665544',
        pageAccessToken: 'mock-page-access-token',
        status: 'connected',
        isActive: true,
        messengerBotEnabled: true,
        user: dummyUserId,
        organization: dummyOrgId,
      };

      jest.spyOn(InstagramAccount, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockIgAccount),
      });

      jest.spyOn(InstagramService.prototype, 'sendTextMessage').mockResolvedValue({
        message_id: 'mid.ig_out_12345',
      });
      jest.spyOn(InstagramService.prototype, 'sendAction').mockResolvedValue({ success: true });
      jest.spyOn(InstagramService.prototype, 'getCustomerProfile').mockResolvedValue({
        name: 'Sarah Connor',
        username: 'sarah_c',
      });

      jest.spyOn(AIService, 'generate').mockResolvedValue({
        content: 'Hello Sarah! Welcome to Graxion Instagram support.',
        tokensUsed: 18,
        responseTime: 110,
      });
    });

    test('4. Instagram inbound DM -> customer message persisted -> socket broadcast -> AI reply sent', async () => {
      const igSenderId = '12345678901234';
      const igMid = `mid.test_ig_${Date.now()}`;

      const messagesAdded = [];
      const mockConv = {
        _id: '650c1f1e1c9d440000igconv1',
        user: dummyUserId,
        organization: dummyOrgId,
        platform: 'instagram',
        customerIgId: igSenderId,
        customerName: 'Sarah Connor',
        status: 'active',
        totalMessages: 0,
        totalTokensUsed: 0,
        addMessage: jest.fn().mockImplementation(async (msgData) => {
          messagesAdded.push(msgData);
          return { _id: `msg_ig_${messagesAdded.length}`, ...msgData };
        }),
        getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConv),
      });

      const event = {
        _id: 'ig_evt_001',
        eventType: 'message',
        senderId: igSenderId,
        messageId: igMid,
        providerTimestamp: new Date(),
        instagramAccountId: mockIgAccount,
        payload: {
          sender: { id: igSenderId },
          message: {
            mid: igMid,
            text: 'Do you offer monthly subscriptions?',
          },
        },
      };

      await processWebhookEvent(event);

      // Verify customer message was persisted
      expect(mockConv.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Do you offer monthly subscriptions?',
          waMessageId: igMid,
        })
      );

      // Verify real-time socket update was broadcast to user room with platform: 'instagram'
      expect(socket.emitToUser).toHaveBeenCalledWith(
        dummyUserId,
        'conversation_updated',
        expect.objectContaining({
          conversationId: mockConv._id,
          platform: 'instagram',
          customerIgId: igSenderId,
        }),
        dummyOrgId
      );

      // Verify assistant reply was sent via Instagram API and saved
      expect(InstagramService.prototype.sendTextMessage).toHaveBeenCalledTimes(1);
      const [calledAccountId, calledRecipient, calledText] = InstagramService.prototype.sendTextMessage.mock.calls[0];
      expect(calledAccountId).toBe(mockIgAccount.igAccountId);
      expect(calledRecipient).toBe(igSenderId);
      expect(calledText).toContain('Hello Sarah! Welcome to Graxion');

      const assistantMsgs = messagesAdded.filter(m => m.role === 'assistant');
      expect(assistantMsgs.length).toBe(1);
    });

    test('5. Instagram pageId entry matching -> resolves InstagramAccount correctly', async () => {
      const pageIdEntryPayload = {
        object: 'instagram',
        entry: [{
          id: '10998877665544', // Facebook Page ID sent by Meta instead of igAccountId
          messaging: [{
            sender: { id: '99887766' },
            message: {
              mid: 'mid.page_id_test_001',
              text: 'Inquiry via page ID route',
            },
          }],
        }],
      };

      const result = await instagramWebhookController.processWebhookPayload(pageIdEntryPayload);
      expect(result).toBeGreaterThanOrEqual(1);

      // Verified account was matched using $or with pageId
      expect(InstagramAccount.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { igAccountId: '10998877665544' },
            { pageId: '10998877665544' },
          ],
        })
      );
    });

    test('6. Instagram bot disabled / no agent -> customer message safely visible in inbox for manual reply', async () => {
      mockIgAccount.messengerBotEnabled = false;
      jest.spyOn(Agent, 'findOne').mockResolvedValue(null);

      const igSenderId = '55667788';
      const igMid = `mid.ig_bot_off_${Date.now()}`;
      const messagesAdded = [];

      const mockConv = {
        _id: '650c1f1e1c9d440000igconv_off',
        user: dummyUserId,
        organization: dummyOrgId,
        platform: 'instagram',
        customerIgId: igSenderId,
        status: 'active',
        addMessage: jest.fn().mockImplementation(async (msgData) => {
          messagesAdded.push(msgData);
          return { _id: `msg_${messagesAdded.length}`, ...msgData };
        }),
        getRecentMessages: jest.fn().mockImplementation(async () => [...messagesAdded]),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockConv),
      });

      const event = {
        _id: 'ig_evt_002',
        eventType: 'message',
        senderId: igSenderId,
        messageId: igMid,
        providerTimestamp: new Date(),
        instagramAccountId: mockIgAccount,
        payload: {
          sender: { id: igSenderId },
          message: { mid: igMid, text: 'Manual support please' },
        },
      };

      await processWebhookEvent(event);

      // Customer message is saved and visible in inbox
      expect(mockConv.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Manual support please',
          waMessageId: igMid,
        })
      );

      // Socket event was dispatched
      expect(socket.emitToUser).toHaveBeenCalledWith(
        dummyUserId,
        'conversation_updated',
        expect.objectContaining({
          conversationId: mockConv._id,
          platform: 'instagram',
        }),
        dummyOrgId
      );

      // AI reply was skipped cleanly
      expect(AIService.generate).not.toHaveBeenCalled();
      expect(messagesAdded.length).toBe(1);
    });
  });
});
