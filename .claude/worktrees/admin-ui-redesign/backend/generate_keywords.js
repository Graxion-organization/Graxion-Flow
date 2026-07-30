const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');

const keywordController = `const KeywordTrigger = require('../models/KeywordTrigger');
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
});`;

const keywordRoutes = `const express = require('express');
const keywordController = require('../controllers/keywordController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(keywordController.getAllKeywords)
  .post(keywordController.createKeyword);

router
  .route('/:id')
  .patch(keywordController.updateKeyword)
  .delete(keywordController.deleteKeyword);

module.exports = router;`;

fs.writeFileSync(path.join(controllersDir, 'keywordController.js'), keywordController);
fs.writeFileSync(path.join(routesDir, 'keywords.js'), keywordRoutes);
console.log('Created Keyword Automation files');
