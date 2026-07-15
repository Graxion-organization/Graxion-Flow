const KeywordTrigger = require('../models/KeywordTrigger');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllKeywords = catchAsync(async (req, res, next) => {
  const keywords = await KeywordTrigger.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { keywords } });
});

exports.createKeyword = catchAsync(async (req, res, next) => {
  const keyword = await KeywordTrigger.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ status: 'success', data: { keyword } });
});

exports.updateKeyword = catchAsync(async (req, res, next) => {
  const keyword = await KeywordTrigger.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true, runValidators: true }
  );
  if (!keyword) return next(new AppError('Keyword not found', 404));
  res.status(200).json({ status: 'success', data: { keyword } });
});

exports.deleteKeyword = catchAsync(async (req, res, next) => {
  const keyword = await KeywordTrigger.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!keyword) return next(new AppError('Keyword not found', 404));
  res.status(204).json({ status: 'success', data: null });
});