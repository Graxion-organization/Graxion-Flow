const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookSubscription',
    required: true,
    index: true
  },
  event: {
    type: String,
    required: true,
    index: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'DELIVERED', 'FAILED', 'RETRYING'],
    default: 'PENDING',
    index: true
  },
  attemptCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  responseStatus: {
    type: Number,
    default: null
  },
  responseBody: {
    type: String,
    default: null
  },
  durationMs: {
    type: Number,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  nextRetryAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

webhookDeliverySchema.index({ organization: 1, createdAt: -1 });
webhookDeliverySchema.index({ subscription: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
