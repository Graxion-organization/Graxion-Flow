const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');

const controllers = {
  'templateController.js': `const Template = require('../models/Template');
const WhatsappAccount = require('../models/WhatsappAccount');
const WhatsAppService = require('../services/whatsappService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { decrypt } = require('../utils/encryption');

exports.getAllTemplates = catchAsync(async (req, res, next) => {
  const templates = await Template.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { templates } });
});

exports.syncTemplatesFromMeta = catchAsync(async (req, res, next) => {
  const waAccount = await WhatsappAccount.findOne({ user: req.user.id, status: 'connected' }).select('+accessToken');
  if (!waAccount) return next(new AppError('No connected WhatsApp account found', 404));

  // In a real app, hit Meta API: GET /v17.0/{waba_id}/message_templates
  // For now, mock the sync
  res.status(200).json({ status: 'success', message: 'Templates synced from Meta' });
});

exports.createTemplate = catchAsync(async (req, res, next) => {
  const template = await Template.create({ ...req.body, organization: req.user.organization });
  // Call Meta API to create template here
  res.status(201).json({ status: 'success', data: { template } });
});

exports.deleteTemplate = catchAsync(async (req, res, next) => {
  const template = await Template.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!template) return next(new AppError('Template not found', 404));
  // Call Meta API to delete template here
  res.status(204).json({ status: 'success', data: null });
});`,

  'broadcastController.js': `const Broadcast = require('../models/Broadcast');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { enqueueBroadcast } = require('../workers/broadcastWorker');

exports.getAllBroadcasts = catchAsync(async (req, res, next) => {
  const broadcasts = await Broadcast.find({ organization: req.user.organization })
    .populate('template', 'name')
    .populate('contactGroup', 'name')
    .sort('-createdAt');
  res.status(200).json({ status: 'success', data: { broadcasts } });
});

exports.createBroadcast = catchAsync(async (req, res, next) => {
  const { name, template, contactGroup, scheduledAt, whatsappAccountId } = req.body;
  
  const broadcast = await Broadcast.create({
    organization: req.user.organization,
    name,
    template,
    contactGroup,
    scheduledAt,
    status: scheduledAt ? 'SCHEDULED' : 'DRAFT'
  });

  if (!scheduledAt) {
    // Fire immediately if not scheduled
    await enqueueBroadcast(broadcast._id, template, contactGroup, whatsappAccountId);
  }

  res.status(201).json({ status: 'success', data: { broadcast } });
});

exports.getBroadcast = catchAsync(async (req, res, next) => {
  const broadcast = await Broadcast.findOne({ _id: req.params.id, organization: req.user.organization })
    .populate('template')
    .populate('contactGroup');
  if (!broadcast) return next(new AppError('Broadcast not found', 404));
  res.status(200).json({ status: 'success', data: { broadcast } });
});`,

  'campaignController.js': `const Campaign = require('../models/Campaign');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllCampaigns = catchAsync(async (req, res, next) => {
  const campaigns = await Campaign.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { campaigns } });
});

exports.createCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ status: 'success', data: { campaign } });
});

exports.getCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!campaign) return next(new AppError('Campaign not found', 404));
  res.status(200).json({ status: 'success', data: { campaign } });
});

exports.updateCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true, runValidators: true }
  );
  if (!campaign) return next(new AppError('Campaign not found', 404));
  res.status(200).json({ status: 'success', data: { campaign } });
});`
};

const routes = {
  'templates.js': `const express = require('express');
const templateController = require('../controllers/templateController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/sync', templateController.syncTemplatesFromMeta);

router
  .route('/')
  .get(templateController.getAllTemplates)
  .post(templateController.createTemplate);

router
  .route('/:id')
  .delete(templateController.deleteTemplate);

module.exports = router;`,

  'broadcasts.js': `const express = require('express');
const broadcastController = require('../controllers/broadcastController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(broadcastController.getAllBroadcasts)
  .post(broadcastController.createBroadcast);

router
  .route('/:id')
  .get(broadcastController.getBroadcast);

module.exports = router;`,

  'campaigns.js': `const express = require('express');
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(campaignController.getAllCampaigns)
  .post(campaignController.createCampaign);

router
  .route('/:id')
  .get(campaignController.getCampaign)
  .patch(campaignController.updateCampaign);

module.exports = router;`
};

for (const [filename, code] of Object.entries(controllers)) {
  fs.writeFileSync(path.join(controllersDir, filename), code);
}
for (const [filename, code] of Object.entries(routes)) {
  fs.writeFileSync(path.join(routesDir, filename), code);
}
console.log('Created Phase 5 Marketing files');
