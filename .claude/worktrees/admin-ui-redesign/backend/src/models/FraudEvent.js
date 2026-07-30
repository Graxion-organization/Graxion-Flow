const mongoose = require('mongoose');

const fraudEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, index: true },
  ip: { type: String, required: true, index: true },
  deviceId: { type: String, index: true },
  location: { type: String },
  riskScore: { type: Number, required: true },
  reasons: [{ type: String }],
  action: { type: String, enum: ['allow', 'require_captcha', 'require_otp', 'block'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('FraudEvent', fraudEventSchema);
