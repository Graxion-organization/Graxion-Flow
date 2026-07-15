const mongoose = require('mongoose');

const platformExecutionSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  accountId: { type: String, required: true },
  accountName: String,
  status: {
    type: String,
    enum: ['pending', 'connecting', 'publishing', 'success', 'failed', 'retrying'],
    default: 'pending',
  },
  attempts: { type: Number, default: 0 },
  publishedAt: Date,
  externalPostId: String,
  errorMessage: String,
  humanMessage: String,
  idempotencyKey: { type: String, index: true },
  formattedContent: {
    text: String,
    hashtags: [String],
    ctaText: String,
    link: String,
    mediaUrls: [String],
  },
}, { _id: false });

const socialPostJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  masterContent: {
    type: { type: String, default: 'post' },
    text: { type: String, default: '' },
    mediaUrls: { type: [String], default: [] },
    hashtags: { type: [String], default: [] },
    ctaText: { type: String, default: '' },
    link: { type: String, default: '' },
    platformOptions: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  mode: { type: String, enum: ['instant', 'scheduled'], default: 'instant' },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  overallStatus: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'partially_failed', 'failed'],
    default: 'queued',
    index: true,
  },
  compatibility: {
    warnings: [{ platform: String, message: String }],
    requiredFixes: [{ platform: String, message: String }],
  },
  selectedPlatforms: { type: [String], default: [] },
  executions: { type: [platformExecutionSchema], default: [] },
}, { timestamps: true });

socialPostJobSchema.index({ user: 1, createdAt: -1 });
socialPostJobSchema.index({ organization: 1, createdAt: -1 });
socialPostJobSchema.index({ overallStatus: 1, scheduledAt: 1 });

module.exports = mongoose.model('SocialPostJob', socialPostJobSchema);
