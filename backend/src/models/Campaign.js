const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['DRIP', 'ONE_TIME', 'EVENT_BASED'], required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  audience: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' },
  schedule: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'], default: 'DRAFT' },
  analytics: {
    messagesSent: { type: Number, default: 0 },
    responses: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);