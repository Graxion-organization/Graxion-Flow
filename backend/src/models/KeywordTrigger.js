const mongoose = require('mongoose');

const keywordTriggerSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  keyword: { type: String, required: true },
  matchType: { type: String, enum: ['EXACT', 'CONTAINS', 'REGEX'], default: 'EXACT' },
  action: { type: String, enum: ['SEND_MESSAGE', 'START_FLOW', 'ASSIGN_AGENT'], required: true },
  response: String,
  flow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
}, { timestamps: true });

module.exports = mongoose.model('KeywordTrigger', keywordTriggerSchema);