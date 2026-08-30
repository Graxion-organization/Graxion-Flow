const mongoose = require('mongoose');

const instagramActionLogSchema = new mongoose.Schema({
  actionId: { type: String, required: true, unique: true }, // Deterministic ID for the action (e.g. ig_action_{webhookEventId}_{type})
  webhookEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramWebhookEvent' },
  instagramAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstagramAccount' },
  actionType: { type: String, required: true }, // e.g. 'send_message', 'reply_comment'
  recipientId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  response: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// TTL index to automatically clean up old action logs after 7 days
instagramActionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('InstagramActionLog', instagramActionLogSchema);
