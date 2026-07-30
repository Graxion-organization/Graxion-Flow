const WhatsAppService = require('../src/services/whatsappService');

describe('WhatsAppService', () => {
  let waService;
  const mockToken = 'mock-token';
  const mockPhoneId = '123456789';
  const mockTo = '919876543210';

  beforeEach(() => {
    waService = new WhatsAppService(mockToken, mockPhoneId);
    
    // Mock the axios instance to intercept requests
    waService.client = {
      post: jest.fn().mockResolvedValue({ data: { message_id: 'msg-123' } })
    };
  });

  test('should build standard text payload correctly', () => {
    const payload = waService._buildPayload(mockTo, 'text', { preview_url: false, body: 'Hello' });
    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mockTo,
      type: 'text',
      text: { preview_url: false, body: 'Hello' }
    });
  });

  test('should include reply context if replyToMessageId is provided', () => {
    const payload = waService._buildPayload(mockTo, 'text', { body: 'Reply' }, 'orig-msg-123');
    expect(payload.context).toBeDefined();
    expect(payload.context.message_id).toBe('orig-msg-123');
  });

  test('sendTextMessage should call axios post with correct arguments', async () => {
    const res = await waService.sendTextMessage(mockTo, 'Hello World');
    
    expect(waService.client.post).toHaveBeenCalledWith(
      `/${mockPhoneId}/messages`,
      expect.objectContaining({
        type: 'text',
        to: mockTo,
        text: { preview_url: false, body: 'Hello World' }
      })
    );
    expect(res).toEqual({ message_id: 'msg-123' });
  });

  test('sendListMessage should format list correctly', async () => {
    const sections = [{ title: 'Section 1', rows: [{ id: 'row1', title: 'Option 1' }] }];
    
    await waService.sendListMessage(mockTo, 'List Body', 'Click Me', sections);
    
    expect(waService.client.post).toHaveBeenCalledWith(
      `/${mockPhoneId}/messages`,
      expect.objectContaining({
        type: 'interactive',
        interactive: expect.objectContaining({
          type: 'list',
          body: { text: 'List Body' },
          action: {
            button: 'Click Me',
            sections
          }
        })
      })
    );
  });
});
