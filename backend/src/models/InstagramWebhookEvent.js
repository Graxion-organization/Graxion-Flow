const mongoose = require('mongoose');

const instagramWebhookEventSchema = new mongoose.Schema({
  provider: { type: String, default: 'instagram' },
  eventId: { type: String, required: true }, // Deterministic ID (e.g., ig_msg_{mid} or ig_cmt_{id})
  eventType: { type: String, required: true }, // 'message', 'message_edit', 'comment'
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  instagramAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' },
  senderId: { type: String },
  recipientId: { type: String },
  messageId: { type: String },
  commentId: { type: String },
  mediaId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  providerTimestamp: { type: Date },
  status: { type: String, enum: ['received', 'queued', 'processing', 'processed', 'retrying', 'failed'], default: 'received' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  receivedAt: { type: Date, default: Date.now },
  processingStartedAt: { type: Date },
  processedAt: { type: Date },
  failedAt: { type: Date }
});

// Unique index for idempotency at the DB level
instagramWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

// Index for queuing / retrieving pending events
instagramWebhookEventSchema.index({ status: 1, receivedAt: 1 });
instagramWebhookEventSchema.index({ instagramAccountId: 1, senderId: 1 });

module.exports = mongoose.model('InstagramWebhookEvent', instagramWebhookEventSchema);
