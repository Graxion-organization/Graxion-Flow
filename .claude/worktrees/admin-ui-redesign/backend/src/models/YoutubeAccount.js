const mongoose = require('mongoose');

const youtubeAccountSchema = new mongoose.Schema({
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
  channelId: {
    type: String,
    required: true,
  },
  channelName: {
    type: String,
  },
  accessToken: {
    type: String,
    required: true,
    select: false,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  tokenExpiry: Date,
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error'],
    default: 'connected',
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

youtubeAccountSchema.index({ user: 1 });
youtubeAccountSchema.index({ organization: 1 });
youtubeAccountSchema.index({ channelId: 1 });

module.exports = mongoose.model('YoutubeAccount', youtubeAccountSchema);
