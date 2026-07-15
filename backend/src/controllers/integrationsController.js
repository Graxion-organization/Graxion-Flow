const Integration = require('../models/Integration');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getIntegrations = catchAsync(async (req, res, next) => {
  const integrations = await Integration.find({ organization: req.organization._id });

  // Do not send sensitive credentials to the frontend
  const safeIntegrations = integrations.map(int => ({
    platform: int.platform,
    status: int.status,
    lastSyncAt: int.lastSyncAt,
    settings: int.settings,
    shopUrl: int.credentials?.shopUrl || null,
    spreadsheetId: int.credentials?.spreadsheetId || null
  }));

  res.status(200).json({
    status: 'success',
    data: safeIntegrations
  });
});

exports.connectIntegration = catchAsync(async (req, res, next) => {
  const { platform } = req.params;
  const { apiKey, accessToken, shopUrl, spreadsheetId } = req.body;

  if (!['shopify', 'stripe', 'hubspot', 'google_sheets'].includes(platform)) {
    return next(new AppError('Invalid integration platform', 400));
  }

  let integration = await Integration.findOne({ 
    organization: req.organization._id, 
    platform 
  });

  if (!integration) {
    integration = new Integration({
      organization: req.organization._id,
      platform,
      credentials: {},
      settings: {}
    });
  }

  // Update credentials based on platform
  if (platform === 'shopify') {
    if (!accessToken || !shopUrl) return next(new AppError('Shopify requires accessToken and shopUrl', 400));
    integration.credentials.accessToken = accessToken;
    integration.credentials.shopUrl = shopUrl;
  } else if (platform === 'stripe') {
    if (!apiKey) return next(new AppError('Stripe requires apiKey', 400));
    integration.credentials.apiKey = apiKey;
  } else if (platform === 'hubspot') {
    if (!accessToken) return next(new AppError('HubSpot requires accessToken', 400));
    integration.credentials.accessToken = accessToken;
  } else if (platform === 'google_sheets') {
    if (!accessToken || !spreadsheetId) return next(new AppError('Google Sheets requires accessToken and spreadsheetId', 400));
    integration.credentials.accessToken = accessToken;
    integration.credentials.spreadsheetId = spreadsheetId;
  }

  integration.status = 'connected';
  await integration.save();

  res.status(200).json({
    status: 'success',
    message: `${platform} connected successfully`,
    data: {
      platform: integration.platform,
      status: integration.status
    }
  });
});

exports.disconnectIntegration = catchAsync(async (req, res, next) => {
  const { platform } = req.params;

  const integration = await Integration.findOne({ 
    organization: req.organization._id, 
    platform 
  });

  if (!integration) {
    return next(new AppError('Integration not found', 404));
  }

  // Clear credentials
  integration.credentials = {};
  integration.status = 'disconnected';
  await integration.save();

  res.status(200).json({
    status: 'success',
    message: `${platform} disconnected successfully`
  });
});
