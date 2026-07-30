const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  triggerKeyword: String, // Optional: if null, might be a welcome flow
  nodes: [{
    id: String,
    type: { type: String, enum: ['start', 'message', 'condition', 'delay', 'action'] },
    data: mongoose.Schema.Types.Mixed, // text, media, delayMs, etc.
    position: { x: Number, y: Number } // For visual builder
  }],
  edges: [{
    id: String,
    source: String, // node id
    target: String, // node id
    sourceHandle: String // for condition nodes (e.g. 'true', 'false')
  }],
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);
