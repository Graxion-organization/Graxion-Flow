const mongoose = require('mongoose');

const apiUsageLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'telegram', 'instagram', 'facebook', 'youtube', 'system'],
    required: true,
  },
  // The start of the hour this log represents
  bucketTime: {
    type: Date,
    required: true,
  },
  apiCalls: {
    type: Number,
    default: 0,
  },
  webhooks: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Compound index for fast upserts and lookups
apiUsageLogSchema.index({ user: 1, platform: 1, bucketTime: 1 }, { unique: true });

module.exports = mongoose.model('ApiUsageLog', apiUsageLogSchema);
