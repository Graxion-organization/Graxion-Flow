const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getDeals = catchAsync(async (req, res, next) => {
  const deals = await Deal.find({ organization: req.user.organization })
    .populate('contact', 'name phone email')
    .sort('-createdAt');
  
  res.json({ status: 'success', data: { deals } });
});

exports.createDeal = catchAsync(async (req, res, next) => {
  const { contactId, title, amount, expectedCloseDate, stage, notes } = req.body;
  
  const contact = await Contact.findOne({ _id: contactId, organization: req.user.organization });
  if (!contact) return next(new AppError('Contact not found', 404));

  const deal = await Deal.create({
    organization: req.user.organization,
    contact: contactId,
    title,
    amount,
    expectedCloseDate,
    stage: stage || 'LEAD',
    notes,
    assignedTo: req.user._id
  });

  // Add timeline event
  contact.timeline.push({
    type: 'NOTE',
    title: 'Deal Created',
    description: `Deal "${title}" created at stage ${deal.stage}`,
    metadata: { dealId: deal._id }
  });
  await contact.save();

  res.status(201).json({ status: 'success', data: { deal } });
});

exports.updateDeal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;
  
  const deal = await Deal.findOne({ _id: id, organization: req.user.organization });
  if (!deal) return next(new AppError('Deal not found', 404));

  Object.assign(deal, updates);
  await deal.save(); // Triggers pre-save hook for timeline

  res.json({ status: 'success', data: { deal } });
});

exports.deleteDeal = catchAsync(async (req, res, next) => {
  const deal = await Deal.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!deal) return next(new AppError('Deal not found', 404));

  res.status(204).json({ status: 'success', data: null });
});
