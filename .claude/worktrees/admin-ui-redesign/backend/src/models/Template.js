const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['AUTHENTICATION', 'MARKETING', 'UTILITY'] },
  language: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  rejectedReason: String,
  components: [mongoose.Schema.Types.Mixed],
  metaTemplateId: String,
  wabaId: String,
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);