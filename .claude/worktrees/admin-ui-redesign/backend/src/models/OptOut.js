const mongoose = require('mongoose');

const optOutSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  phone: { type: String, required: true },
  reason: String,
  optOutAt: { type: Date, default: Date.now },
}, { timestamps: true });

optOutSchema.index({ organization: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('OptOut', optOutSchema);