const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  contactGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' },
  status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'DRAFT' },
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  scheduledAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);