const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminEmail: {
    type: String,
    required: true,
  },
  adminAccessKey: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true, // e.g., 'approve_signup', 'update_user', 'update_settings', 'refund_payment', 'whitelisted_beta'
  },
  details: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for fast lookup on admin auditing searches
adminActivitySchema.index({ adminAccessKey: 1 });
adminActivitySchema.index({ timestamp: -1 });
adminActivitySchema.index({ action: 1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
