const mongoose = require('mongoose');

const developerAuditLogSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    index: true
  },
  clientId: {
    type: String,
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
    default: null
  },
  action: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  latencyMs: {
    type: Number,
    default: 0
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  scopesUsed: {
    type: [String],
    default: []
  },
  idempotencyKey: {
    type: String,
    default: null
  },
  errorCode: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

developerAuditLogSchema.index({ organization: 1, createdAt: -1 });
developerAuditLogSchema.index({ clientId: 1, createdAt: -1 });
developerAuditLogSchema.index({ statusCode: 1, createdAt: -1 });

module.exports = mongoose.model('DeveloperAuditLog', developerAuditLogSchema);
