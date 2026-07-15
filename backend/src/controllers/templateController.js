const Template = require('../models/Template');
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
});