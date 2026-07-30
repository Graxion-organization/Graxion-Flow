const mongoose = require('mongoose');

const agentMemorySchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  memoryText: {
    type: String,
    required: true
  }
}, { timestamps: true });

agentMemorySchema.index({ agent: 1, customerPhone: 1 }, { unique: true });

module.exports = mongoose.model('AgentMemory', agentMemorySchema);
