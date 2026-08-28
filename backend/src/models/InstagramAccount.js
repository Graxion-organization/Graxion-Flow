const mongoose = require('mongoose');

const instagramAccountSchema = new mongoose.Schema({
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
  igAccountId: {
    type: String,
    required: true,
  },
  igUsername: {
    type: String,
  },
  igName: {
    type: String,
  },
  profilePictureUrl: {
    type: String,
  },
  pageId: {
    type: String,
    required: true,
  },
  pageName: {
    type: String,
  },
  fbPagePictureUrl: {
    type: String,
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
  commentBotEnabled: { type: Boolean, default: false },
  commentBotPrompt: { 
    type: String, 
    default: "You are a helpful assistant. Reply to this Instagram comment in a friendly way. Keep it short." 
  },
  messengerBotEnabled: { type: Boolean, default: false },
  messengerBotPrompt: { 
    type: String, 
    default: "You are a helpful assistant. Reply to this Instagram message in a friendly way. Keep it short." 
  },
}, { timestamps: true });

instagramAccountSchema.index({ user: 1 });
instagramAccountSchema.index({ organization: 1 });
instagramAccountSchema.index({ igAccountId: 1 }, { unique: true });

module.exports = mongoose.model('InstagramAccount', instagramAccountSchema);
