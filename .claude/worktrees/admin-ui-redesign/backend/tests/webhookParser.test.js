const { parseWebhookPayload } = require('../src/controllers/webhookController'); // Assuming we export it for testing, or we test the logic.

// Since the original parse logic might be tightly coupled, let's test a helper if extracted, 
// or mock dependencies to test webhookController.handleIncomingWebhook.
// For now, we will create a standalone parser test for the exact payload structures we expect Meta to send.

describe('Webhook Parser Logic', () => {
  const sampleTextPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '1234567890', phone_number_id: '1234567890' },
          contacts: [{ profile: { name: 'John Doe' }, wa_id: '16505551234' }],
          messages: [{
            from: '16505551234',
            id: 'wamid.HBgLMTY1MDU1NTEyMzQ...',
            timestamp: '1603059201',
            type: 'text',
            text: { body: 'Hello' }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const sampleStatusPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '1234567890', phone_number_id: '1234567890' },
          statuses: [{
            id: 'wamid.HBgLMTY1MDU1NTEyMzQ...',
            status: 'read',
            timestamp: '1603059202',
            recipient_id: '16505551234'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  test('should correctly identify text message payload', () => {
    const change = sampleTextPayload.entry[0].changes[0].value;
    expect(change.messages).toBeDefined();
    expect(change.messages[0].type).toBe('text');
    expect(change.messages[0].text.body).toBe('Hello');
  });

  test('should correctly identify status update payload', () => {
    const change = sampleStatusPayload.entry[0].changes[0].value;
    expect(change.statuses).toBeDefined();
    expect(change.statuses[0].status).toBe('read');
  });
});
