const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_settings'
  },
  defaultPartnerCommissionRate: {
    type: Number,
    default: 20, // 20%
  },
  commissionType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
    default: 'PERCENTAGE',
  },
  minPayoutThreshold: {
    type: Number,
    default: 1000, // INR 1000
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
