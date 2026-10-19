const mongoose = require('mongoose');

const SUPPORTED_WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'lead.hot_detected',
  'conversation.message.received',
  'conversation.message.sent',
  'conversation.handoff.requested',
  'conversation.closed',
  'contact.created',
  'contact.updated',
  'deal.created',
  'deal.stage_changed',
  'flow.triggered',
  'webhook.ping'
];

const webhookSubscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  targetUrl: {
    type: String,
    required: true,
    trim: true
  },
  events: {
    type: [String],
    required: true,
    validate: {
      validator: function (events) {
        return Array.isArray(events) && events.length > 0 && events.every((e) => SUPPORTED_WEBHOOK_EVENTS.includes(e));
      },
      message: 'Invalid or empty webhook event subscription list.'
    }
  },
  signingSecret: {
    type: String,
    required: true,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  timeoutMs: {
    type: Number,
    default: 10000,
    min: 1000,
    max: 30000
  },
  failureCount: {
    type: Number,
    default: 0
  },
  lastDeliveredAt: {
    type: Date,
    default: null
  },
  lastFailureAt: {
    type: Date,
    default: null
  },
  lastFailureReason: {
    type: String,
    default: null
  },
  createdByClient: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

webhookSubscriptionSchema.index({ organization: 1, isActive: 1 });
webhookSubscriptionSchema.statics.SUPPORTED_WEBHOOK_EVENTS = SUPPORTED_WEBHOOK_EVENTS;

module.exports = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
