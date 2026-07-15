const axios = require('axios');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const fs = require('fs');
const FormData = require('form-data');

const META_API_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION}`;

class WhatsAppService {
  constructor(accessToken, phoneNumberId) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.client = axios.create({
      baseURL: META_API_BASE,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  _buildPayload(to, type, payloadBody, replyToMessageId = null) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: payloadBody,
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
    }

    return payload;
  }

  async sendTextMessage(to, text, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'text', { preview_url: false, body: text }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendTextMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send WhatsApp message.', 502);
    }
  }

  async sendAudioMessage(to, audioUrl, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'audio', { link: audioUrl }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendAudioMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send audio message.', 502);
    }
  }

  async sendImageMessage(to, imageUrl, caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'image', { link: imageUrl, caption }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendImageMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send image message.', 502);
    }
  }

  async sendDocumentMessage(to, documentUrl, filename = 'document.pdf', caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'document', { link: documentUrl, caption, filename }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendDocumentMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send document message.', 502);
    }
  }

  async sendVideoMessage(to, videoUrl, caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'video', { link: videoUrl, caption }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendVideoMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send video message.', 502);
    }
  }

  async sendLocationMessage(to, latitude, longitude, name = '', address = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'location', { latitude, longitude, name, address }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendLocationMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send location message.', 502);
    }
  }

  async sendContactMessage(to, contactsArray, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'contacts', contactsArray, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendContactMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send contact message.', 502);
    }
  }

  async sendStickerMessage(to, stickerUrl, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/\${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'sticker', { link: stickerUrl }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendStickerMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send sticker message.', 502);
    }
  }

  async sendReaction(to, messageId, emoji) {
    try {
      const response = await this.client.post(`/\${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji,
        },
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendReaction error:', err.response?.data || err.message);
      throw new AppError('Failed to send reaction.', 502);
    }
  }

  async sendListMessage(
    to,
    bodyText,
    buttonText,
    sections,
    headerText = null,
    footerText = null,
    replyToMessageId = null
  ) {
    try {
      const interactive = {
        type: 'list',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          button: buttonText,
          sections,
        },
      };
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'interactive', interactive, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendListMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send list message.', 502);
    }
  }

  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp sendTemplateMessage error:', err.response?.data || err.message);
      throw new AppError('Failed to send template message.', 502);
    }
  }

  async markAsRead(messageId) {
    try {
      await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (err) {
      logger.warn(`Failed to mark message ${messageId} as read.`);
    }
  }

  // --- Meta API Advanced Management ---

  async registerPhoneNumber(pin) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/register`, {
        messaging_product: 'whatsapp',
        pin
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp registerPhoneNumber error:', err.response?.data || err.message);
      throw new AppError('Failed to register phone number.', 502);
    }
  }

  async updateBusinessProfile(data) {
    // data: { address, description, email, websites, about, profile_picture_handle }
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/whatsapp_business_profile`, {
        messaging_product: 'whatsapp',
        ...data
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp updateBusinessProfile error:', err.response?.data || err.message);
      throw new AppError('Failed to update business profile.', 502);
    }
  }

  async uploadMediaToMeta(fileStream, mimeType, length) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fileStream);
      form.append('type', mimeType);
      form.append('messaging_product', 'whatsapp');

      const response = await this.client.post(`/${this.phoneNumberId}/media`, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Length': length
        }
      });
      return response.data; // { id: '<MEDIA_ID>' }
    } catch (err) {
      logger.error('WhatsApp uploadMediaToMeta error:', err.response?.data || err.message);
      throw new AppError('Failed to upload media to Meta.', 502);
    }
  }

  async getMessageTemplates(wabaId) {
    try {
      const response = await this.client.get(`/${wabaId}/message_templates`);
      return response.data;
    } catch (err) {
      logger.error('WhatsApp getMessageTemplates error:', err.response?.data || err.message);
      throw new AppError('Failed to fetch message templates from Meta.', 502);
    }
  }

  static async getSystemUserToken(appId, appSecret) {
    try {
      const axios = require('axios');
      // Fetches a generic access token using app secret (often used to manage system users)
      const response = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'client_credentials'
        }
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp getSystemUserToken error:', err.response?.data || err.message);
      throw new AppError('Failed to fetch system user token.', 502);
    }
  }

  // --- Static Verifier & Parser ---
  static async verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    throw new Error('Verification failed');
  }

  static parseWebhookMessage(body) {
    try {
      if (body.object !== 'whatsapp_business_account') return null;

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) return null;

      if (value.statuses && value.statuses.length > 0) {
        const statusObj = value.statuses[0];
        
        return {
          isStatusUpdate: true,
          messageId: statusObj.id,
          status: statusObj.status, // 'sent', 'delivered', 'read', 'failed'
          recipientId: statusObj.recipient_id,
          timestamp: statusObj.timestamp,
          pricing: statusObj.pricing // For conversation pricing tracking
        };
      }

      // Handle template status webhooks
      if (value.event === 'message_template_status_update') {
        return {
          isTemplateStatusUpdate: true,
          templateId: value.message_template_id,
          templateName: value.message_template_name,
          templateLanguage: value.message_template_language,
          status: value.event_update?.status,
          reason: value.event_update?.reason
        };
      }

      // Handle account quality updates
      if (value.event === 'account_update' || value.event === 'account_reviews_update') {
        return {
          isAccountUpdate: true,
          phoneNumberId: value.phone_number_id,
          displayPhoneNumber: value.display_phone_number,
          decision: value.decision,
          event_update: value.event_update
        };
      }

      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const contact = value.contacts?.[0];

        let text = '';
        let buttonReply = null;
        let listReply = null;

        if (message.type === 'text') {
          text = message.text.body;
        } else if (message.type === 'interactive') {
          if (message.interactive.type === 'button_reply') {
            buttonReply = message.interactive.button_reply;
            text = buttonReply.title;
          } else if (message.interactive.type === 'list_reply') {
            listReply = message.interactive.list_reply;
            text = listReply.title;
          }
        }

        return {
          isStatusUpdate: false,
          phoneNumberId: value.metadata.phone_number_id,
          from: message.from,
          customerName: contact?.profile?.name || 'Unknown',
          messageId: message.id,
          timestamp: message.timestamp,
          type: message.type,
          text,
          audioId: message.type === 'audio' ? message.audio.id : null,
          imageId: message.type === 'image' ? message.image.id : null,
          documentId: message.type === 'document' ? message.document.id : null,
          videoId: message.type === 'video' ? message.video.id : null,
          stickerId: message.type === 'sticker' ? message.sticker.id : null,
          reaction: message.type === 'reaction' ? message.reaction : null,
          location: message.type === 'location' ? message.location : null,
          contacts: message.type === 'contacts' ? message.contacts : null,
          buttonReply,
          listReply,
        };
      }
      return null;
    } catch (err) {
      logger.error('Error parsing webhook body', err);
      return null;
    }
  }
}

module.exports = WhatsAppService;
