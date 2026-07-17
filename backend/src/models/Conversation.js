const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
  },
  whatsappAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsappAccount',
  },
  telegramAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramAccount',
  },
  instagramAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstagramAccount',
  },
  facebookAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FacebookAccount',
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'telegram', 'instagram', 'facebook'],
    default: 'whatsapp',
  },

  // Customer info
  customerPhone: {
    type: String,
  },
  customerUsername: String,
  customerName: String,
  customerWaId: String,
  customerTgId: String,
  customerIgId: String,
  customerFbId: String,

  // Status
  status: {
    type: String,
    enum: ['active', 'closed', 'human_handoff', 'waiting'],
    default: 'active',
  },
  messageCount: {
    type: Number,
    default: 0,
  },

  // Metadata
  totalMessages: { type: Number, default: 0 },
  totalTokensUsed: { type: Number, default: 0 },
  lastMessageAt: Date,
  resolvedAt: Date,

  // Tags for filtering
  tags: [String],
  
  // CRM Features
  leadScore: { type: Number, default: 0 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,

  isRead: { type: Boolean, default: false },
}, {
  timestamps: true,
});

conversationSchema.index({ user: 1, status: 1 });
conversationSchema.index({ organization: 1, status: 1 });
conversationSchema.index({ user: 1, customerPhone: 1 });
conversationSchema.index({ agent: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Methods for Message handling
conversationSchema.methods.addMessage = async function(data) {
  const Message = require('./Message');
  const msg = await Message.create({ conversationId: this._id, ...data });
  this.messageCount += 1;
  this.lastMessageAt = msg.timestamp || new Date();
  await this.save();
  return msg;
};

conversationSchema.methods.getRecentMessages = async function(limit = 50) {
  const Message = require('./Message');
  const msgs = await Message.find({ conversationId: this._id }).sort({ timestamp: -1 }).limit(limit);
  return msgs.reverse();
};

module.exports = mongoose.model('Conversation', conversationSchema);
