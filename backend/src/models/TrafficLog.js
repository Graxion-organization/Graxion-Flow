const mongoose = require('mongoose');

const trafficLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  device: {
    type: String, // 'desktop', 'mobile', 'tablet'
  },
  source: {
    type: String, // e.g. 'chatgpt', 'instagram', 'facebook', 'linkedin', 'direct', 'google'
    index: true
  },
  referrer: {
    type: String,
  },
  path: {
    type: String,
  },
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 86400 * 365 // Automatically delete after 1 year (optional)
  }
});

// Index for efficient aggregation
trafficLogSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model('TrafficLog', trafficLogSchema);
