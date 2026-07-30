const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');

const models = {
  'Contact.js': `const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  tags: [String],
  customFields: { type: Map, of: String },
  optIn: { type: Boolean, default: false },
  source: String,
  lastMessageAt: Date,
}, { timestamps: true });

contactSchema.index({ organization: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);`,

  'ContactGroup.js': `const mongoose = require('mongoose');

const contactGroupSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  filterCriteria: { type: mongoose.Schema.Types.Mixed },
  contactCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ContactGroup', contactGroupSchema);`,

  'Template.js': `const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['AUTHENTICATION', 'MARKETING', 'UTILITY'] },
  language: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  components: [mongoose.Schema.Types.Mixed],
  metaTemplateId: String,
  wabaId: String,
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);`,

  'Broadcast.js': `const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  contactGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' },
  status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'DRAFT' },
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  scheduledAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);`,

  'Campaign.js': `const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['DRIP', 'ONE_TIME', 'EVENT_BASED'], required: true },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  audience: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' },
  schedule: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'], default: 'DRAFT' },
  analytics: {
    messagesSent: { type: Number, default: 0 },
    responses: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);`,

  'WebhookLog.js': `const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  platform: { type: String, required: true, enum: ['whatsapp', 'instagram', 'facebook', 'telegram'] },
  eventType: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['PENDING', 'PROCESSED', 'FAILED'], default: 'PENDING' },
  processedAt: Date,
  error: String,
}, { timestamps: true });

webhookLogSchema.index({ status: 1, processedAt: -1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);`,

  'Flow.js': `const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  triggerType: { type: String, enum: ['KEYWORD', 'API', 'MANUAL'], default: 'KEYWORD' },
  nodes: [mongoose.Schema.Types.Mixed],
  edges: [mongoose.Schema.Types.Mixed],
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);`,

  'KeywordTrigger.js': `const mongoose = require('mongoose');

const keywordTriggerSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  keyword: { type: String, required: true },
  matchType: { type: String, enum: ['EXACT', 'CONTAINS', 'REGEX'], default: 'EXACT' },
  action: { type: String, enum: ['SEND_MESSAGE', 'START_FLOW', 'ASSIGN_AGENT'], required: true },
  response: String,
  flow: { type: mongoose.Schema.Types.ObjectId, ref: 'Flow' },
}, { timestamps: true });

module.exports = mongoose.model('KeywordTrigger', keywordTriggerSchema);`,

  'OptOut.js': `const mongoose = require('mongoose');

const optOutSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  phone: { type: String, required: true },
  reason: String,
  optOutAt: { type: Date, default: Date.now },
}, { timestamps: true });

optOutSchema.index({ organization: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('OptOut', optOutSchema);`,

  'Invoice.js': `const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  paymentId: String,
  invoiceNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  total: { type: Number, required: true },
  pdfUrl: String,
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);`,

  'Notification.js': `const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);`
};

for (const [filename, code] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), code);
  console.log('Created ' + filename);
}
