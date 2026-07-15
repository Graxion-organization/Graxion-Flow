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

  if (!waAccount.wabaId) return next(new AppError('WhatsApp Business Account ID not found on this account', 400));

  const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
  const metaResponse = await waService.getMessageTemplates(waAccount.wabaId);
  const metaTemplates = metaResponse.data || [];

  const upsertPromises = metaTemplates.map(tpl => {
    return Template.findOneAndUpdate(
      { name: tpl.name, language: tpl.language, organization: req.user.organization },
      {
        name: tpl.name,
        category: tpl.category,
        language: tpl.language,
        components: tpl.components,
        status: tpl.status,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  await Promise.all(upsertPromises);

  res.status(200).json({ status: 'success', message: 'Templates synced from Meta', count: metaTemplates.length });
});

exports.createTemplate = catchAsync(async (req, res, next) => {
  const { name, category, language, components } = req.body;
  
  if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
    return next(new AppError('Invalid category. Must be MARKETING, UTILITY, or AUTHENTICATION', 400));
  }

  const template = await Template.create({ 
    organization: req.user.organization,
    name,
    category,
    language,
    components,
    status: 'PENDING'
  });
  
  // In a real app: Call Meta API to create template here
  res.status(201).json({ status: 'success', data: { template } });
});

exports.deleteTemplate = catchAsync(async (req, res, next) => {
  const template = await Template.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!template) return next(new AppError('Template not found', 404));
  // Call Meta API to delete template here
  res.status(204).json({ status: 'success', data: null });
});