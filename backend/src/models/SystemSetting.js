const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: String,
  updatedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
