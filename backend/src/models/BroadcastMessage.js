const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema({
  broadcast: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Broadcast',
    required: true,
    index: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  messageId: {
    type: String,
    required: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent',
  },
  errorReason: String,
}, {
  timestamps: true,
});

// Compound index for quick lookups
broadcastMessageSchema.index({ broadcast: 1, messageId: 1 });

module.exports = mongoose.model('BroadcastMessage', broadcastMessageSchema);
