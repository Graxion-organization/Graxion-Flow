const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
    required: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  prompts: [{
    name: String,
    content: String
  }],
  ssoConfig: {
    enabled: { type: Boolean, default: false },
    entryPoint: { type: String }, // IdP Login URL
    issuer: { type: String },     // SP Entity ID
    cert: { type: String }        // IdP Public Cert
  }
}, {
  timestamps: true,
});

// Create slug before saving
organizationSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    this.slug = `${this.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomSuffix}`;
  }

  // Validate member limits
  if (this.isModified('members')) {
    try {
      const User = mongoose.model('User');
      const owner = await User.findById(this.owner);
      if (owner) {
        const limits = await owner.getPlanLimits();
        if (this.members.length > limits.teamMembers) {
          return next(new Error(`Team member limit exceeded. Your plan allows ${limits.teamMembers} members.`));
        }
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
});

organizationSchema.index({ owner: 1 });
organizationSchema.index({ slug: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
