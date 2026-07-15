const Flow = require('../models/Flow');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.createFlow = catchAsync(async (req, res, next) => {
  const newFlow = await Flow.create({
    organization: req.organization._id,
    ...req.body
  });
  res.status(201).json({ status: 'success', data: { flow: newFlow } });
});

exports.getFlows = catchAsync(async (req, res, next) => {
  const flows = await Flow.find({ organization: req.organization._id }).lean();
  res.status(200).json({ status: 'success', results: flows.length, data: { flows } });
});

exports.getFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOne({ _id: req.params.id, organization: req.organization._id }).lean();
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(200).json({ status: 'success', data: { flow } });
});

exports.updateFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(200).json({ status: 'success', data: { flow } });
});

exports.deleteFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOneAndDelete({ _id: req.params.id, organization: req.organization._id });
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(204).json({ status: 'success', data: null });
});
