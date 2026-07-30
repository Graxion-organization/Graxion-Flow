const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  waMessageId: {
    type: String,
    index: true,
  }, // Meta's message ID
  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'document', 'location', 'interactive', 'button', 'list', 'template'],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent',
  },
  media: {
    type: mongoose.Schema.Types.Mixed, // flexible for storing { url, id, mimeType, location_data, etc }
  },
  tokens: Number,
  responseTime: Number, // ms
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for fast paginated queries per conversation
messageSchema.index({ conversationId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
