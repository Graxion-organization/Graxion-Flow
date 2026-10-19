const mongoose = require('mongoose');
const crypto = require('crypto');

const ALLOWED_SCOPES = [
  'system:read',
  'leads:read',
  'contacts:read',
  'contacts:write',
  'deals:read',
  'deals:write',
  'automations:read',
  'automations:trigger',
  'webhooks:read',
  'webhooks:write',
  'diagnostics:read',
  'auth:manage',
  '*'
];

const developerServiceClientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: 'Graxion Developer Management System S2S Client'
  },
  secretHash: {
    type: String,
    required: true,
    select: false
  },
  previousSecretHash: {
    type: String,
    select: false,
    default: null
  },
  previousSecretExpiresAt: {
    type: Date,
    default: null
  },
  scopes: {
    type: [String],
    default: ['*'],
    validate: {
      validator: function (scopes) {
        return Array.isArray(scopes) && scopes.every((s) => ALLOWED_SCOPES.includes(s));
      },
      message: 'One or more scopes are invalid.'
    }
  },
  // Empty array means authorized for all active organizations (management plane)
  // If populated, restricts this S2S client to specific organization IDs
  allowedOrganizations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }],
  allowedIps: {
    type: [String],
    default: []
  },
  rateLimitPerMinute: {
    type: Number,
    default: 600,
    min: 10,
    max: 10000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedTokenJtis: {
    type: [String],
    default: []
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  secretRotatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

developerServiceClientSchema.statics.hashSecret = function (rawSecret) {
  return crypto.createHash('sha256').update(String(rawSecret)).digest('hex');
};

developerServiceClientSchema.methods.verifySecret = function (candidateSecret) {
  if (!candidateSecret || this.isRevoked || !this.isActive) return false;
  const candidateHash = crypto.createHash('sha256').update(String(candidateSecret)).digest('hex');
  const candidateBuf = Buffer.from(candidateHash, 'utf8');

  if (this.secretHash) {
    const currentBuf = Buffer.from(this.secretHash, 'utf8');
    if (currentBuf.length === candidateBuf.length && crypto.timingSafeEqual(currentBuf, candidateBuf)) {
      return true;
    }
  }

  if (
    this.previousSecretHash &&
    this.previousSecretExpiresAt &&
    new Date(this.previousSecretExpiresAt) > new Date()
  ) {
    const prevBuf = Buffer.from(this.previousSecretHash, 'utf8');
    if (prevBuf.length === candidateBuf.length && crypto.timingSafeEqual(prevBuf, candidateBuf)) {
      return true;
    }
  }

  return false;
};

developerServiceClientSchema.statics.ALLOWED_SCOPES = ALLOWED_SCOPES;

module.exports = mongoose.model('DeveloperServiceClient', developerServiceClientSchema);
