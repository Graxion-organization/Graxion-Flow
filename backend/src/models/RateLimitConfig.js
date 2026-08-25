const mongoose = require('mongoose');

const rateLimitConfigSchema = new mongoose.Schema({
  scope: {
    type: String,
    enum: ['global', 'user'],
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'telegram', 'instagram', 'facebook', 'youtube', 'all'],
    required: true,
  },
  limitPerHour: {
    type: Number,
    default: 1000,
  },
  limitPerDay: {
    type: Number,
    default: 10000,
  },
}, { timestamps: true });

// Ensure a user can only have one config per platform
rateLimitConfigSchema.index({ scope: 1, user: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('RateLimitConfig', rateLimitConfigSchema);
