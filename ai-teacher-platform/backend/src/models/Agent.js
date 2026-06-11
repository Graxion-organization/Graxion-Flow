const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  personaPrompt: {
    type: String,
    required: true,
    default: "You are a professional sales agent. Your goal is to explain the provided plan clearly and answer any questions."
  },
  elevenLabsVoiceId: {
    type: String,
    required: true
  },
  knowledgeBase: [{
    fileUrl: String,
    fileType: { type: String, enum: ['pdf', 'video', 'image', 'text'] },
    metadata: mongoose.Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Agent', agentSchema);
