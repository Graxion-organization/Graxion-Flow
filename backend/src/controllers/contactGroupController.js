const ContactGroup = require('../models/ContactGroup');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllGroups = catchAsync(async (req, res, next) => {
  const groups = await ContactGroup.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { groups } });
});

exports.createGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ status: 'success', data: { group } });
});

exports.updateGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true, runValidators: true }
  );
  if (!group) return next(new AppError('Group not found', 404));
  res.status(200).json({ status: 'success', data: { group } });
});

exports.deleteGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!group) return next(new AppError('Group not found', 404));
  res.status(204).json({ status: 'success', data: null });
});