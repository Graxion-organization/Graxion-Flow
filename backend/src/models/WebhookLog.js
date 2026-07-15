const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  platform: { type: String, required: true, enum: ['whatsapp', 'instagram', 'facebook', 'telegram'] },
  eventType: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'], default: 'PENDING' },
  processedAt: Date,
  error: String,
}, { timestamps: true });

webhookLogSchema.index({ status: 1, processedAt: -1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);