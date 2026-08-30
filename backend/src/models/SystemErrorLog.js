const mongoose = require('mongoose');

const systemErrorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  stack: {
    type: String,
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
  },
  level: {
    type: String,
    default: 'error',
    enum: ['error', 'warn', 'info', 'debug'],
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  count: {
    type: Number,
    default: 1,
  },
  lastOccurredAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for fast querying in admin panel
systemErrorLogSchema.index({ resolved: 1, createdAt: -1 });
systemErrorLogSchema.index({ level: 1 });

module.exports = mongoose.model('SystemErrorLog', systemErrorLogSchema);
