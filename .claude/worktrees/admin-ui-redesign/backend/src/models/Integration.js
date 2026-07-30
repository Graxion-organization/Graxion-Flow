const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const integrationSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  platform: {
    type: String,
    enum: ['shopify', 'stripe', 'hubspot', 'google_sheets'],
    required: true,
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error'],
    default: 'disconnected'
  },
  credentials: {
    apiKey: String,
    accessToken: String,
    refreshToken: String,
    shopUrl: String, // Shopify specific
    spreadsheetId: String // Google Sheets specific
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastSyncAt: Date,
}, { timestamps: true });

// Ensure unique platform per organization
integrationSchema.index({ organization: 1, platform: 1 }, { unique: true });

// Pre-save hook to encrypt credentials
integrationSchema.pre('save', function(next) {
  const integration = this;
  if (!integration.isModified('credentials')) return next();
  
  if (integration.credentials.apiKey && !integration.credentials.apiKey.includes(':')) {
    integration.credentials.apiKey = encrypt(integration.credentials.apiKey);
  }
  if (integration.credentials.accessToken && !integration.credentials.accessToken.includes(':')) {
    integration.credentials.accessToken = encrypt(integration.credentials.accessToken);
  }
  if (integration.credentials.refreshToken && !integration.credentials.refreshToken.includes(':')) {
    integration.credentials.refreshToken = encrypt(integration.credentials.refreshToken);
  }
  next();
});

// Helper method to get decrypted credentials
integrationSchema.methods.getDecryptedCredentials = function() {
  const decrypted = { ...this.credentials };
  if (decrypted.apiKey && decrypted.apiKey.includes(':')) decrypted.apiKey = decrypt(decrypted.apiKey);
  if (decrypted.accessToken && decrypted.accessToken.includes(':')) decrypted.accessToken = decrypt(decrypted.accessToken);
  if (decrypted.refreshToken && decrypted.refreshToken.includes(':')) decrypted.refreshToken = decrypt(decrypted.refreshToken);
  return decrypted;
};

module.exports = mongoose.model('Integration', integrationSchema);
