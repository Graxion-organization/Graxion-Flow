const Broadcast = require('../models/Broadcast');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { enqueueBroadcast } = require('../workers/broadcastWorker');

exports.getAllBroadcasts = catchAsync(async (req, res, next) => {
  const broadcasts = await Broadcast.find({ organization: req.organization._id })
    .populate('template', 'name')
    .populate('contactGroup', 'name')
    .sort('-createdAt');
  res.status(200).json({ status: 'success', data: { broadcasts } });
});
 
exports.createBroadcast = catchAsync(async (req, res, next) => {
  const { name, template, contactGroup, scheduledAt, whatsappAccountId } = req.body;
 
  if (!whatsappAccountId) {
    return next(new AppError('WhatsApp Account ID is required', 400));
  }
  
  const broadcast = await Broadcast.create({
    organization: req.organization._id,
    name,
    template,
    contactGroup: contactGroup === 'all' ? null : contactGroup,
    scheduledAt,
    whatsappAccountId,
    status: scheduledAt ? 'SCHEDULED' : 'IN_PROGRESS'
  });
 
  if (!scheduledAt) {
    // Fire immediately if not scheduled
    await enqueueBroadcast(broadcast._id, template, contactGroup, whatsappAccountId);
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