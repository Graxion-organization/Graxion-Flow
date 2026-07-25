const mongoose = require('mongoose');

const keywordTriggerSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  keyword: { type: String, required: true },
  matchType: { type: String, enum: ['EXACT', 'CONTAINS', 'REGEX'], default: 'EXACT' },
  action: { type: String, enum: ['SEND_MESSAGE', 'START_FLOW', 'ASSIGN_AGENT'], required: true },
  response: String,
  flow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
  platforms: { type: [{ type: String, enum: ['whatsapp', 'instagram', 'facebook', 'telegram'] }], default: ['whatsapp'] },
  replyType: { type: String, enum: ['DM', 'COMMENT', 'ALL'], default: 'ALL' },
  mediaUrl: String,
  mediaType: { type: String, enum: ['none', 'image', 'video', 'audio', 'document'], default: 'none' }
}, { timestamps: true });

module.exports = mongoose.model('KeywordTrigger', keywordTriggerSchema);