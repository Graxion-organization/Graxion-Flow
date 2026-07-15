const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'whatsappController.js');
let code = fs.readFileSync(filePath, 'utf8');

const newMethods = `
// Update Business Profile (WA-032)
exports.updateBusinessProfile = async (req, res, next) => {
  try {
    const { address, description, email, websites, about } = req.body;
    const account = await WhatsappAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select('+accessToken');
    if (!account) return next(new AppError('Account not found', 404));

    const waService = new WhatsAppService(decrypt(account.accessToken), account.phoneNumberId);
    
    const payload = {
      messaging_product: 'whatsapp',
      address, description, email, websites, about
    };

    // Clean undefined fields
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const response = await waService.client.post(\`/\${account.phoneNumberId}/whatsapp_business_profile\`, payload);
    
    res.status(200).json({ status: 'success', data: { profile: response.data } });
  } catch (err) {
    logger.error('Update Business Profile error:', err.response?.data || err.message);
    next(new AppError('Failed to update business profile on Meta', 500));
  }
};

// Get Quality Rating (WA-033)
exports.getQualityRating = async (req, res, next) => {
  try {
    const account = await WhatsappAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select('+accessToken');
    if (!account) return next(new AppError('Account not found', 404));

    const waService = new WhatsAppService(decrypt(account.accessToken), account.phoneNumberId);
    
    const response = await waService.client.get(\`/\${account.phoneNumberId}?fields=quality_rating\`);
    
    account.qualityRating = response.data.quality_rating;
    await account.save();

    res.status(200).json({ status: 'success', data: { qualityRating: response.data.quality_rating } });
  } catch (err) {
    logger.error('Get Quality Rating error:', err.response?.data || err.message);
    next(new AppError('Failed to fetch quality rating from Meta', 500));
  }
};
`;

code = code.replace(/module\.exports = \{/g, ''); // Fix export structure if it was an object, but it uses exports.
code += newMethods;

fs.writeFileSync(filePath, code);

// Update wabaRateLimit.js
const rateLimitCode = `const rateLimit = require('express-rate-limit');

// WABA allows 80 req/sec for Tier 1+. 
// We set a slightly lower limit to avoid strict Meta blocks.
exports.wabaRateLimit = rateLimit({
  windowMs: 1000, // 1 second
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests to WhatsApp API. Rate limit exceeded.'
  }
});`;

fs.writeFileSync(path.join(__dirname, 'src', 'middleware', 'wabaRateLimit.js'), rateLimitCode);

// Update conversation controller (WA-035)
const convCode = `
exports.addTag = catchAsync(async (req, res, next) => {
  const { tag } = req.body;
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    { $addToSet: { tags: tag } },
    { new: true }
  );
  if (!conversation) return next(new AppError('Conversation not found', 404));
  res.status(200).json({ status: 'success', data: { tags: conversation.tags } });
});

exports.removeTag = catchAsync(async (req, res, next) => {
  const { tag } = req.params;
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    { $pull: { tags: tag } },
    { new: true }
  );
  if (!conversation) return next(new AppError('Conversation not found', 404));
  res.status(200).json({ status: 'success', data: { tags: conversation.tags } });
});
`;

let convFile = fs.readFileSync(path.join(__dirname, 'src', 'controllers', 'conversationController.js'), 'utf8');
convFile += convCode;
fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'conversationController.js'), convFile);
