const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Feature flag key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-_]+$/, 'Key can only contain lowercase letters, numbers, hyphens, and underscores']
  },
  name: {
    type: String,
    required: [true, 'Feature flag name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true // Kill-switch: if false, feature is disabled for everyone
  },
  rules: {
    rolloutPercentage: {
      type: Number,
      default: 100, // 0 - 100
      min: 0,
      max: 100
    },
    targetUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    targetEmails: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    targetPlans: [{
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise']
    }],
    betaOnly: {
      type: Boolean,
      default: false
    }
  },
  evalStats: {
    enabledCount: { type: Number, default: 0 },
    disabledCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for fast lookups
featureFlagSchema.index({ key: 1 });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
