const mongoose = require('mongoose');

const facebookAccountSchema = new mongoose.Schema({
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
  pageId: {
    type: String,
    required: true,
  },
  pageName: {
    type: String,
    required: true,
  },
  pageAccessToken: {
    type: String,
    required: true,
    select: false, 
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error'],
    default: 'connected',
  },
  errorMessage: String,
  tokenExpiry: Date,
  lastValidatedAt: Date,
  isActive: { type: Boolean, default: true },
  messengerBotEnabled: { type: Boolean, default: false },
  messengerBotPrompt: { 
    type: String, 
    default: "You are a helpful assistant. Reply to this Facebook message in a friendly way. Keep it short." 
  },
}, { timestamps: true });

facebookAccountSchema.index({ user: 1 });
facebookAccountSchema.index({ organization: 1 });
facebookAccountSchema.index({ pageId: 1 }, { unique: true });

module.exports = mongoose.model('FacebookAccount', facebookAccountSchema);
