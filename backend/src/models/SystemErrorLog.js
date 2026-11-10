const mongoose = require('mongoose');

const systemErrorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    default: 'ERROR',
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    index: true,
  },
  level: {
    type: String,
    default: 'error',
    enum: ['critical', 'error', 'warn', 'warning', 'info', 'debug'],
  },
  service: {
    type: String,
    default: 'internal',
    index: true,
  },
  provider: {
    type: String,
    default: 'internal',
    index: true,
  },
  errorCode: {
    type: String,
    index: true,
  },
  statusCode: {
    type: Number,
  },
  endpoint: {
    type: String,
  },
  requestId: {
    type: String,
    index: true,
  },
  workspaceId: {
    type: String,
    index: true,
  },
  userId: {
    type: String,
    index: true,
  },
  conversationId: {
    type: String,
    index: true,
  },
  messageId: {
    type: String,
    index: true,
  },
  queueName: {
    type: String,
  },
  jobId: {
    type: String,
  },
  retryAttempt: {
    type: Number,
  },
  stage: {
    type: String,
  },
  stack: {
    type: String,
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  count: {
    type: Number,
    default: 1,
  },
  lastOccurredAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes for fast querying and filtering in Admin Logs panel
systemErrorLogSchema.index({ resolved: 1, lastOccurredAt: -1 });
systemErrorLogSchema.index({ resolved: 1, createdAt: -1 });
systemErrorLogSchema.index({ level: 1 });
systemErrorLogSchema.index({ severity: 1, service: 1, lastOccurredAt: -1 });

module.exports = mongoose.model('SystemErrorLog', systemErrorLogSchema);

