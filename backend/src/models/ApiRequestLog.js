const mongoose = require('mongoose');

const apiRequestLogSchema = new mongoose.Schema({
  provider: { type: String, required: true }, // 'openai', 'gemini', 'anthropic', 'openrouter', etc.
  modelName: { type: String }, // 'gpt-4', 'gemini-1.5-pro', etc.
  requestPayload: { type: mongoose.Schema.Types.Mixed }, // Raw request or prompt
  responsePayload: { type: mongoose.Schema.Types.Mixed }, // Raw response from API
  status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  error: { type: String },
  processingTimeMs: { type: Number }, // Duration of API call in ms
}, { timestamps: true });

// Indexes for faster querying in the dashboard
apiRequestLogSchema.index({ status: 1, createdAt: -1 });
apiRequestLogSchema.index({ provider: 1, createdAt: -1 });
apiRequestLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ApiRequestLog', apiRequestLogSchema);
