const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'owner', 'admin', 'editor', 'viewer', 'superadmin'], // 'user' kept for legacy
    default: 'owner', // New default is owner of their own personal tenant
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  emailVerifyExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Subscription
  subscription: {
    plan: { type: String, default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'cancelled', 'past_due'], default: 'active' },
    razorpaySubscriptionId: String,
    razorpayCustomerId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    messageLimit: { type: Number, default: 100 },
    agentLimit: { type: Number, default: 1 },
    credits: { type: Number, default: 100 },
    totalCredits: { type: Number, default: 100 },
    agentCreditLimit: { type: Number, default: 0 }, // 0 = unlimited
    postingCreditLimit: { type: Number, default: 0 }, // 0 = unlimited
  },

  // Usage tracking
  usage: {
    messagesThisMonth: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    agentCreditsUsedThisMonth: { type: Number, default: 0 },
    postingCreditsUsedThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
  },

  isActive: { type: Boolean, default: true },
  isBetaTester: { type: Boolean, default: false },
  
  // Deletion Request
  isDeletionPending: { type: Boolean, default: false },
  deletionRequestedAt: Date,
  isAccountDisabled: { type: Boolean, default: false },
  deletionReason: String,
  deletionFeedback: String,
  deletionOTP1: String,
  deletionOTP2: String,
  deletionOTP3: String,
  deletionOTPExpires: Date,
  
  // Role Assignment OTP
  roleChangeOTP: String,
  roleChangeOTPExpires: Date,
  pendingRoleAssignment: {
    type: String,
    enum: ['user', 'admin']
  },
  
  // Social Platforms
  youtube: {
    connected: { type: Boolean, default: false },
    channelId: String,
    channelName: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiry: Date
  },

  lastLogin: Date,
  currentOrganization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  adminAccessKey: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ 'subscription.plan': 1 });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (this.role === 'admin' && !this.adminAccessKey) {
    this.adminAccessKey = `ADM-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Generate email verify token
userSchema.methods.createEmailVerifyToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerifyToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Plan limits
userSchema.methods.getPlanLimits = async function () {
  const fallbackLimits = {
    free:       { messages: 100,   agents: 1,  credits: 100,   label: 'Free' },
    starter:    { messages: 1000,  agents: 3,  credits: 1000,  label: 'Starter' },
    pro:        { messages: 5000,  agents: 10, credits: 5000,  label: 'Pro' },
    enterprise: { messages: 50000, agents: 50, credits: 50000, label: 'Enterprise' },
  };

  const planCode = this.subscription?.plan || 'free';

  try {
    const Plan = mongoose.model('Plan');
    const dbPlan = await Plan.findOne({ code: planCode });
    if (dbPlan) {
      return {
        messages: dbPlan.messageLimit,
        agents: dbPlan.agentLimit,
        credits: dbPlan.credits,
        label: dbPlan.name,
      };
    }
  } catch (err) {
    // Ignore error and fallback if Plan model is missing or DB fails
  }

  return fallbackLimits[planCode] || fallbackLimits.free;
};

// Cascade delete related entities
userSchema.pre(['deleteOne', 'findOneAndDelete', 'remove'], async function (next) {
  const userId = this.getQuery ? this.getQuery()._id : this._id;
  if (!userId) return next();

  try {
    const models = [
      'Organization', 'Agent', 'Conversation', 'Message', 
      'WhatsappAccount', 'InstagramAccount', 'FacebookAccount', 'TelegramAccount',
      'Invoice', 'Notification'
    ];
    
    for (const modelName of models) {
      if (mongoose.models[modelName]) {
        await mongoose.models[modelName].deleteMany({ $or: [{ user: userId }, { owner: userId }] });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);
