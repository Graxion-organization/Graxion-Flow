const OptOut = require('../models/OptOut');
const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllOptOuts = catchAsync(async (req, res, next) => {
  const optOuts = await OptOut.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { optOuts } });
});

exports.addOptOut = catchAsync(async (req, res, next) => {
  const { phone, reason } = req.body;
  const optOut = await OptOut.findOneAndUpdate(
    { organization: req.user.organization, phone },
    { reason, optOutAt: Date.now() },
    { upsert: true, new: true }
  );
  
  await Contact.updateOne({ organization: req.user.organization, phone }, { optIn: false });
  
  res.status(201).json({ status: 'success', data: { optOut } });
});

exports.removeOptOut = catchAsync(async (req, res, next) => {
  const { phone } = req.params;
  await OptOut.findOneAndDelete({ organization: req.user.organization, phone });
  await Contact.updateOne({ organization: req.user.organization, phone }, { optIn: true });
  res.status(204).json({ status: 'success', data: null });
});