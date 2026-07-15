const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  tags: [String],
  customFields: { type: Map, of: String },
  optIn: { type: Boolean, default: false },
  source: String,
  lastMessageAt: Date,
}, { timestamps: true });

contactSchema.index({ organization: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);