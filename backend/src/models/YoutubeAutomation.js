const mongoose = require('mongoose');

const youtubeAutomationSchema = new mongoose.Schema({
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
  enabled: {
    type: Boolean,
    default: false,
  },
  automationMode: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'manual', // Default to manual as per "manual approval mode" request
  },
  aiPrompt: {
    type: String,
    default: 'You are a helpful YouTube creator. Reply to this comment in a friendly and engaging way. Keep it short and encourage the viewer.',
  },
  lastCheckedAt: {
    type: Date,
    default: Date.now,
  },
  repliedCommentIds: [String], // Simple cache to prevent duplicates
  pendingComments: [{
    commentId: String,
    authorName: String,
    authorThumbnail: String,
    text: String,
    videoId: String,
    videoTitle: String,
    publishedAt: Date,
    aiSuggestedReply: String,
    status: {
      type: String,
      enum: ['pending', 'replied', 'ignored'],
      default: 'pending'
    }
  }],
  replyHistory: [{
    commentId: String,
    videoId: String,
    videoTitle: String,
    authorName: String,
    authorThumbnail: String,
    userComment: String,
    aiReply: String,
    repliedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

youtubeAutomationSchema.index({ user: 1 });
youtubeAutomationSchema.index({ organization: 1 });
youtubeAutomationSchema.index({ enabled: 1 });

module.exports = mongoose.model('YoutubeAutomation', youtubeAutomationSchema);
