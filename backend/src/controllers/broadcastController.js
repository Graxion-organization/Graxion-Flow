const Broadcast = require('../models/Broadcast');
const Template = require('../models/Template');
const ContactGroup = require('../models/ContactGroup');
const WhatsappAccount = require('../models/WhatsappAccount');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { enqueueBroadcast } = require('../workers/broadcastWorker');

exports.getAllBroadcasts = catchAsync(async (req, res, next) => {
  const orgId = req.organization?._id || req.user?.currentOrganization;
  const broadcasts = await Broadcast.find({ organization: orgId })
    .populate('template', 'name')
    .populate('contactGroup', 'name')
    .sort('-createdAt');
  res.status(200).json({ status: 'success', data: { broadcasts } });
});

exports.createBroadcast = catchAsync(async (req, res, next) => {
  const { name, scheduledAt } = req.body;
  const orgId = req.organization?._id || req.user?.currentOrganization;

  // Accept both 'template' and 'templateId'
  const templateId = req.body.template || req.body.templateId;
  
  // Accept both 'contactGroup' and 'contactGroupId'
  const rawGroup = req.body.contactGroup !== undefined ? req.body.contactGroup : req.body.contactGroupId;
  const contactGroupId = (rawGroup === 'all' || !rawGroup) ? null : rawGroup;

  const whatsappAccountId = req.body.whatsappAccountId || req.body.whatsappAccount;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Campaign name is required', 400));
  }

  if (!templateId) {
    return next(new AppError('Path `template` is required. Please select an approved template.', 400));
  }

  if (!whatsappAccountId) {
    return next(new AppError('WhatsApp Account ID is required', 400));
  }

  // Verify WhatsApp Account belongs to this organization
  const waAccount = await WhatsappAccount.findOne({
    _id: whatsappAccountId,
    organization: orgId
  });
  if (!waAccount) {
    return next(new AppError('WhatsApp Account not found or does not belong to your organization', 404));
  }

  // Verify Template belongs to this organization
  const templateDoc = await Template.findOne({
    _id: templateId,
    organization: orgId
  });
  if (!templateDoc) {
    return next(new AppError('Selected template not found or does not belong to your organization', 404));
  }

  // Verify Contact Group if specified
  if (contactGroupId) {
    const groupDoc = await ContactGroup.findOne({
      _id: contactGroupId,
      organization: orgId
    });
    if (!groupDoc) {
      return next(new AppError('Selected audience group not found or does not belong to your organization', 404));
    }
  }

  const broadcast = await Broadcast.create({
    organization: orgId,
    name: name.trim(),
    template: templateDoc._id,
    contactGroup: contactGroupId,
    scheduledAt: scheduledAt || null,
    whatsappAccountId: waAccount._id,
    status: scheduledAt ? 'SCHEDULED' : 'IN_PROGRESS'
  });

  if (scheduledAt) {
    const delayMs = new Date(scheduledAt).getTime() - Date.now();
    if (delayMs > 0) {
      await enqueueBroadcast(broadcast._id, templateDoc._id, contactGroupId, waAccount._id, delayMs);
    } else {
      await enqueueBroadcast(broadcast._id, templateDoc._id, contactGroupId, waAccount._id);
    }
  } else {
    // Fire immediately if not scheduled
    await enqueueBroadcast(broadcast._id, templateDoc._id, contactGroupId, waAccount._id);
  }

  res.status(201).json({ status: 'success', data: { broadcast } });
});
 
exports.getBroadcast = catchAsync(async (req, res, next) => {
  const broadcast = await Broadcast.findOne({ _id: req.params.id, organization: req.organization._id })
    .populate('template')
    .populate('contactGroup');
  if (!broadcast) return next(new AppError('Broadcast not found', 404));
  res.status(200).json({ status: 'success', data: { broadcast } });
});

exports.getBroadcastFailures = catchAsync(async (req, res, next) => {
  const BroadcastMessage = require('../models/BroadcastMessage');
  const failures = await BroadcastMessage.find({
    broadcast: req.params.id,
    organization: req.organization._id,
    status: 'failed'
  }).select('phone errorReason createdAt');
  
  res.status(200).json({ status: 'success', data: { failures } });
});