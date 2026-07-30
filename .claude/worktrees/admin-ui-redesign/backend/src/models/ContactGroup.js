const mongoose = require('mongoose');

const contactGroupSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  filterCriteria: { type: mongoose.Schema.Types.Mixed },
  contactCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ContactGroup', contactGroupSchema);