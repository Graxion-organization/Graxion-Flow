const mongoose = require('mongoose');

const postAutomationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  platform: { type: String, enum: ['instagram', 'facebook'], default: 'instagram' },
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
  mediaId: { type: String, required: true, index: true },
  triggerType: { type: String, enum: ['ALL_COMMENTS', 'KEYWORD'], default: 'ALL_COMMENTS' },
  keywords: { type: [String], default: [] },
  dmMessage: { type: String, required: true },
  commentReply: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PostAutomation', postAutomationSchema);
