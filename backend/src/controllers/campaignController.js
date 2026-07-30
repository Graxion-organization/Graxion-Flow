const Campaign = require('../models/Campaign');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllCampaigns = catchAsync(async (req, res, next) => {
  const campaigns = await Campaign.find({ organization: (req.organization?._id || req.user?.currentOrganization) }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { campaigns } });
});

exports.createCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.create({ ...req.body, organization: (req.organization?._id || req.user?.currentOrganization) });
  res.status(201).json({ status: 'success', data: { campaign } });
});

exports.getCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, organization: (req.organization?._id || req.user?.currentOrganization) });
  if (!campaign) return next(new AppError('Campaign not found', 404));
  res.status(200).json({ status: 'success', data: { campaign } });
});

exports.updateCampaign = catchAsync(async (req, res, next) => {
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, organization: (req.organization?._id || req.user?.currentOrganization) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!campaign) return next(new AppError('Campaign not found', 404));
  res.status(200).json({ status: 'success', data: { campaign } });
});