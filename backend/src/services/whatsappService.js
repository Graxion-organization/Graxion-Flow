const axios = require('axios');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const fs = require('fs');
const FormData = require('form-data');

const META_API_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

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

  _handleApiError(action, err, defaultMessage, statusCodeOverride = 502) {
    const statusCode = err.response?.status || statusCodeOverride;
    const metaErr = err.response?.data?.error || {};
    logger.error(`WhatsApp ${action} error:`, {
      service: 'whatsappService',
      provider: 'whatsapp',
      statusCode,
      errorCode: metaErr.code || err.code,
      endpoint: `/${this.phoneNumberId}/messages`,
      responseBody: err.response?.data || err.message,
    });
    const appErr = new AppError(defaultMessage, statusCodeOverride);
    appErr.statusCode = statusCode;
    appErr.errorCode = metaErr.code || err.code;
    appErr.response = err.response;
    throw appErr;
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

  async sendTextMessage(to, text, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'text', { preview_url: false, body: text }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendTextMessage', err, 'Failed to send WhatsApp message.', 502);
    }
  }

  async sendAudioMessage(to, audioUrl, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'audio', { link: audioUrl }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendAudioMessage', err, 'Failed to send audio message.', 502);
    }
  }

  async sendImageMessage(to, imageUrl, caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'image', { link: imageUrl, caption }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendImageMessage', err, 'Failed to send image message.', 502);
    }
  }

  async sendDocumentMessage(to, documentUrl, filename = 'document.pdf', caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'document', { link: documentUrl, caption, filename }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendDocumentMessage', err, 'Failed to send document message.', 502);
    }
  }

  async sendVideoMessage(to, videoUrl, caption = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'video', { link: videoUrl, caption }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendVideoMessage', err, 'Failed to send video message.', 502);
    }
  }

  async sendLocationMessage(to, latitude, longitude, name = '', address = '', replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'location', { latitude, longitude, name, address }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendLocationMessage', err, 'Failed to send location message.', 502);
    }
  }

  async sendContactMessage(to, contactsArray, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'contacts', contactsArray, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendContactMessage', err, 'Failed to send contact message.', 502);
    }
  }

  async sendStickerMessage(to, stickerUrl, replyToMessageId = null) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        this._buildPayload(to, 'sticker', { link: stickerUrl }, replyToMessageId)
      );
      return response.data;
    } catch (err) {
      this._handleApiError('sendStickerMessage', err, 'Failed to send sticker message.', 502);
    }
  }

  async sendReaction(to, messageId, emoji) {
    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, {
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
      this._handleApiError('sendReaction', err, 'Failed to send reaction.', 502);
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
      this._handleApiError('sendListMessage', err, 'Failed to send list message.', 502);
    }
  }

  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    try {
      // All template messages (MARKETING, UTILITY, AUTHENTICATION) use the same /messages endpoint
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
      this._handleApiError('sendTemplateMessage', err, 'Failed to send template message.', 502);
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

  async createMessageTemplate(wabaId, templateData) {
    try {
      const response = await this.client.post(`/${wabaId}/message_templates`, templateData);
      return response.data; // { id: '...', status: 'PENDING' }
    } catch (err) {
      logger.error('WhatsApp createMessageTemplate error:', err.response?.data || err.message);
      const metaMsg = err.response?.data?.error?.message || err.response?.data?.error?.error_user_msg || 'Failed to submit template to Meta Graph API.';
      throw new AppError(metaMsg, 400);
    }
  }

  async deleteMessageTemplate(wabaId, templateName) {
    try {
      const response = await this.client.delete(`/${wabaId}/message_templates`, {
        params: { name: templateName }
      });
      return response.data;
    } catch (err) {
      logger.error('WhatsApp deleteMessageTemplate error:', err.response?.data || err.message);
      const metaMsg = err.response?.data?.error?.message || 'Failed to delete template on Meta.';
      throw new AppError(metaMsg, 400);
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
    const validVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && validVerifyToken && token === validVerifyToken) {
      return challenge;
    }
    throw new Error('Verification failed');
  }

  /**
   * Parses all events across all entries and changes in a WhatsApp webhook payload.
   * Ensures status updates never mask incoming messages in the same payload,
   * and multiple entries/changes/messages are all extracted safely.
   */
  static parseWebhookEvents(body) {
    const events = [];
    try {
      if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
        return events;
      }

      for (const entry of body.entry) {
        const changesList = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changesList) {
          const value = change?.value;
          if (!value) continue;

          // 1. Extract all status updates
          if (Array.isArray(value.statuses) && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              if (!statusObj) continue;
              events.push({
                isStatusUpdate: true,
                messageId: statusObj.id,
                status: statusObj.status, // 'sent', 'delivered', 'read', 'failed'
                reason: statusObj.errors
                  ? (statusObj.errors[0]?.error_data?.details || statusObj.errors[0]?.message || statusObj.errors[0]?.title)
                  : undefined,
                recipientId: statusObj.recipient_id,
                timestamp: statusObj.timestamp,
                pricing: statusObj.pricing,
              });
            }
          }

          // 2. Extract template status updates
          if (value.event === 'message_template_status_update') {
            events.push({
              isTemplateStatusUpdate: true,
              templateId: value.message_template_id,
              templateName: value.message_template_name,
              templateLanguage: value.message_template_language,
              status: value.event_update?.status,
              reason: value.event_update?.reason,
            });
          }

          // 3. Extract account quality updates
          if (value.event === 'account_update' || value.event === 'account_reviews_update') {
            events.push({
              isAccountUpdate: true,
              phoneNumberId: value.phone_number_id,
              displayPhoneNumber: value.display_phone_number,
              decision: value.decision,
              event_update: value.event_update,
            });
          }

          // 4. Extract all incoming messages (even if statuses were also present in the same change value)
          if (Array.isArray(value.messages) && value.messages.length > 0) {
            const contacts = Array.isArray(value.contacts) ? value.contacts : [];
            const phoneNumId = value.metadata?.phone_number_id || value.phone_number_id || entry?.id;

            for (let i = 0; i < value.messages.length; i++) {
              const message = value.messages[i];
              if (!message) continue;

              const matchedContact =
                contacts.find((c) => c?.wa_id === message.from) ||
                contacts[i] ||
                contacts[0];

              let text = '';
              let buttonReply = null;
              let listReply = null;

              if (message.type === 'text') {
                text = message.text?.body || '';
              } else if (message.type === 'interactive' && message.interactive) {
                if (message.interactive.type === 'button_reply' && message.interactive.button_reply) {
                  buttonReply = message.interactive.button_reply;
                  text = buttonReply.title || '';
                } else if (message.interactive.type === 'list_reply' && message.interactive.list_reply) {
                  listReply = message.interactive.list_reply;
                  text = listReply.title || '';
                }
              }

              logger.info(`[WhatsApp Webhook] Parsed incoming message ${message.id} from ${message.from} on phoneId: ${phoneNumId}`);

              events.push({
                isStatusUpdate: false,
                phoneNumberId: phoneNumId,
                from: message.from,
                customerName: matchedContact?.profile?.name || 'Unknown',
                messageId: message.id,
                timestamp: message.timestamp,
                type: message.type,
                text,
                audioId: message.type === 'audio' ? message.audio?.id : null,
                imageId: message.type === 'image' ? message.image?.id : null,
                documentId: message.type === 'document' ? message.document?.id : null,
                videoId: message.type === 'video' ? message.video?.id : null,
                stickerId: message.type === 'sticker' ? message.sticker?.id : null,
                reaction: message.type === 'reaction' ? message.reaction : null,
                location: message.type === 'location' ? message.location : null,
                contacts: message.type === 'contacts' ? message.contacts : null,
                buttonReply,
                listReply,
              });
            }
          }
        }
      }

      return events;
    } catch (err) {
      logger.error('Error parsing webhook body', err);
      return events;
    }
  }

  static parseWebhookMessage(body) {
    const events = WhatsAppService.parseWebhookEvents(body);
    if (!events || events.length === 0) return null;
    // Prefer returning the first incoming message if present, otherwise first event
    const firstIncomingMessage = events.find((e) => !e.isStatusUpdate && !e.isTemplateStatusUpdate && !e.isAccountUpdate);
    return firstIncomingMessage || events[0];
  }
}

module.exports = WhatsAppService;
