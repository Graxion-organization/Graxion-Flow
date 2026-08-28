const mongoose = require('mongoose');

const postAIToggleSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'youtube', 'linkedin'],
    required: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  mediaId: {
    type: String,
    required: true,
    index: true
  },
  isAiEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Ensure one toggle per mediaId per organization
postAIToggleSchema.index({ organization: 1, mediaId: 1 }, { unique: true });

module.exports = mongoose.model('PostAIToggle', postAIToggleSchema);
