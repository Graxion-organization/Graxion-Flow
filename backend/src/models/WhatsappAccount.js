const mongoose = require('mongoose');

const whatsappAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  // Meta WhatsApp Business API credentials (encrypted)
  phoneNumberId: {
    type: String,
    required: true,
  },
  wabaId: { // WhatsApp Business Account ID
    type: String,
    required: true,
  },
  accessToken: {
    type: String, // Stored encrypted
    required: true,
    select: false,
  },
  displayPhoneNumber: {
    type: String,
    required: true,
  },
  verifiedName: String,

  // Connection status
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'pending', 'error'],
    default: 'pending',
  },
  lastVerified: Date,
  errorMessage: String,

  // Webhook
  webhookVerified: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

whatsappAccountSchema.index({ user: 1 });
whatsappAccountSchema.index({ organization: 1 });
whatsappAccountSchema.index({ phoneNumberId: 1 }, { unique: true });

module.exports = mongoose.model('WhatsappAccount', whatsappAccountSchema);
