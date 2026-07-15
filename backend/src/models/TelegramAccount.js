const mongoose = require('mongoose');

const telegramAccountSchema = new mongoose.Schema({
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
  // Telegram Bot Token (encrypted in production, but storing raw for now if encryption utility not fully mapped)
  botToken: {
    type: String,
    required: true,
    select: false,
  },
  botUsername: {
    type: String,
    required: true,
  },
  botName: {
    type: String,
  },
  defaultChatId: {
    type: String,
    default: '',
  },
  // Connection status
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error'],
    default: 'connected',
  },
  errorMessage: String,

  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

telegramAccountSchema.index({ user: 1 });
telegramAccountSchema.index({ organization: 1 });
telegramAccountSchema.index({ botUsername: 1 }, { unique: true });

module.exports = mongoose.model('TelegramAccount', telegramAccountSchema);
