const KeywordTrigger = require('../models/KeywordTrigger');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const validateKeywordPayload = (payload) => {
  if (payload.platforms && (payload.platforms.includes('instagram') || payload.platforms.includes('facebook') || payload.platforms.includes('telegram')) && payload.mediaType === 'document') {
    throw new AppError('Instagram/Facebook/Telegram currently do not support sending documents/PDFs via this API.', 400);
  }
  if (payload.replyType === 'COMMENT' && payload.mediaType !== 'none') {
    throw new AppError('Comments only support text replies.', 400);
  }
};

exports.getAllKeywords = catchAsync(async (req, res, next) => {
  const keywords = await KeywordTrigger.find({ organization: req.organization._id }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { keywords } });
});

exports.createKeyword = catchAsync(async (req, res, next) => {
  validateKeywordPayload(req.body);
  if (req.body.matchType) req.body.matchType = req.body.matchType.toUpperCase();
  const keyword = await KeywordTrigger.create({ ...req.body, organization: req.organization._id });
  res.status(201).json({ status: 'success', data: { keyword } });
});

exports.updateKeyword = catchAsync(async (req, res, next) => {
  validateKeywordPayload(req.body);
  if (req.body.matchType) req.body.matchType = req.body.matchType.toUpperCase();
  const keyword = await KeywordTrigger.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!keyword) return next(new AppError('Keyword not found', 404));
  res.status(200).json({ status: 'success', data: { keyword } });
});

exports.deleteKeyword = catchAsync(async (req, res, next) => {
  const keyword = await KeywordTrigger.findOneAndDelete({ _id: req.params.id, organization: req.organization._id });
  if (!keyword) return next(new AppError('Keyword not found', 404));
  res.status(204).json({ status: 'success', data: null });
});