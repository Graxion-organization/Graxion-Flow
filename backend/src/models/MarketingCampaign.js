const mongoose = require('mongoose');

const marketingCampaignSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessDetails: {
    name: { type: String, required: true },
    timings: { type: String },
    businessModel: { type: String }, // B2B, B2C, Local, E-commerce, etc.
    category: { type: String },
    description: { type: String },
    products: { type: String },
    targetAudience: { type: String },
    tone: { type: String },
    platforms: [{ type: String }], // ['instagram', 'facebook', 'linkedin', 'youtube', 'telegram']
    contactDetails: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      address: { type: String, default: '' }
    }
  },
  strategy: {
    overallHook: { type: String },
    targetPlatforms: [{ type: String }],
    postingRoutine: { type: String },
    adStrategy: { type: String },
    actionPlan: [{ type: String }]
  },
  calendar: [{
    day: { type: Number },
    theme: { type: String },
    type: { type: String }, // 'post', 'reel', 'story', 'carousel'
    platforms: [{ type: String }],
    caption: { type: String },
    imagePrompt: { type: String },
    videoScript: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String }, // 'image', 'video'
    scheduledAt: { type: Date },
    status: { type: String, default: 'draft' }, // 'draft', 'generating', 'ready', 'scheduled', 'failed'
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPostJob' },
    error: { type: String },
    slides: [{
      slideNumber: { type: Number },
      heading: { type: String },
      body: { type: String },
      imagePrompt: { type: String }
    }]
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  }
}, { timestamps: true });

// Indexing for quick lookups
marketingCampaignSchema.index({ organization: 1, status: 1 });
marketingCampaignSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('MarketingCampaign', marketingCampaignSchema);
