const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getDeals = catchAsync(async (req, res, next) => {
  const deals = await Deal.find({ organization: (req.organization?._id || req.user?.currentOrganization) })
    .populate('contact', 'name phone email')
    .sort('-createdAt');
  
  res.json({ status: 'success', data: { deals } });
});

exports.createDeal = catchAsync(async (req, res, next) => {
  const { contactId, title, amount, expectedCloseDate, stage, notes } = req.body;
  
  const contact = await Contact.findOne({ _id: contactId, organization: (req.organization?._id || req.user?.currentOrganization) });
  if (!contact) return next(new AppError('Contact not found', 404));

  const deal = await Deal.create({
    organization: (req.organization?._id || req.user?.currentOrganization),
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
  const ALLOWED_DEAL_UPDATE_FIELDS = ['title', 'amount', 'stage', 'expectedCloseDate', 'notes', 'assignedTo'];
  
  const deal = await Deal.findOne({ _id: id, organization: (req.organization?._id || req.user?.currentOrganization) });
  if (!deal) return next(new AppError('Deal not found', 404));

  for (const field of ALLOWED_DEAL_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      deal[field] = req.body[field];
    }
  }
  await deal.save(); // Triggers pre-save hook for timeline

  res.json({ status: 'success', data: { deal } });
});

exports.deleteDeal = catchAsync(async (req, res, next) => {
  const deal = await Deal.findOneAndDelete({ _id: req.params.id, organization: (req.organization?._id || req.user?.currentOrganization) });
  if (!deal) return next(new AppError('Deal not found', 404));

  res.status(204).json({ status: 'success', data: null });
});
