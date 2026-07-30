const mongoose = require('mongoose');

const globalKnowledgeBaseSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  textData: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('GlobalKnowledgeBase', globalKnowledgeBaseSchema);
