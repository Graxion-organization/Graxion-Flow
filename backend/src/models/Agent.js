const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
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
  whatsappAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsappAccount',
  },
  telegramAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramAccount',
  },
  instagramAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InstagramAccount',
  },
  facebookAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FacebookAccount',
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'telegram', 'both', 'instagram', 'facebook', 'all'],
    default: 'whatsapp',
  },
  agentType: {
    type: String,
    enum: ['social', 'presenter'],
    default: 'social'
  },
  elevenLabsVoiceId: {
    type: String,
  },
  knowledgeBase: [{
    fileUrl: String,
    fileName: String, // Original filename for display
    textData: String, // Extracted text content (for PDF, text prompts)
    fileType: { type: String, enum: ['pdf', 'video', 'image', 'text', 'document'] },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Agent identity
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 chars'],
  },
  description: { type: String, maxlength: 200 },
  avatar: String,

  // AI configuration
  aiProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'gemini', 'openrouter'],
    default: 'openai',
  },
  model: {
    type: String,
    default: 'gpt-4o',
  },
  systemPrompt: {
    type: String,
    required: [true, 'System prompt is required'],
    maxlength: [4000, 'System prompt cannot exceed 4000 chars'],
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2,
  },
  maxTokens: {
    type: Number,
    default: 500,
    min: 50,
    max: 2000,
  },

  // Behavior
  responseLanguage: { type: String, default: 'auto' }, // 'auto', 'en', 'hi', etc.
  fallbackMessage: {
    type: String,
    default: 'Sorry, I could not understand that. Please try again.',
  },
  humanHandoffKeywords: [String], // e.g. ["human", "agent", "support"]
  humanHandoffMessage: {
    type: String,
    default: 'Connecting you to a human agent...',
  },
  greetingMessage: String,
  outOfHoursMessage: String,

  // Business hours
  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'Asia/Kolkata' },
    schedule: {
      monday:    { open: String, close: String, active: Boolean },
      tuesday:   { open: String, close: String, active: Boolean },
      wednesday: { open: String, close: String, active: Boolean },
      thursday:  { open: String, close: String, active: Boolean },
      friday:    { open: String, close: String, active: Boolean },
      saturday:  { open: String, close: String, active: Boolean },
      sunday:    { open: String, close: String, active: Boolean },
    },
  },

  // Context memory
  contextWindow: {
    type: Number,
    default: 10, // last N messages to keep as context
    min: 1,
    max: 50,
  },

  // Status
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },

  // Stats
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }, // ms
    satisfactionScore: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

agentSchema.index({ user: 1, isActive: 1 });
agentSchema.index({ organization: 1, isActive: 1 });
agentSchema.index({ whatsappAccount: 1 });

module.exports = mongoose.model('Agent', agentSchema);
