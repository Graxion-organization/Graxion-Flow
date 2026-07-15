const WhatsappAccount = require('../models/WhatsappAccount');
const WhatsAppService = require('../services/whatsappService');
const AppError = require('../utils/AppError');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// Connect a WhatsApp Business account
exports.connectAccount = async (req, res, next) => {
  try {
    const { phoneNumberId, wabaId, accessToken, displayPhoneNumber, verifiedName } = req.body;

    // Check if this phoneNumberId already belongs to another organization
    const existing = await WhatsappAccount.findOne({ phoneNumberId });
    if (existing && existing.organization.toString() !== req.organization._id.toString()) {
      return next(new AppError('This phone number is already connected to another organization.', 400));
    }

    // Check account limit for user plan
    const userAccounts = await WhatsappAccount.countDocuments({
      user: req.user._id,
      isActive: true,
      ...(existing ? { _id: { $ne: existing._id } } : {}),
    });
    const limits = await req.user.getPlanLimits();
    if (!existing && userAccounts >= limits.agents) {
      return next(new AppError(`Your plan allows only ${limits.agents} WhatsApp number(s). Please upgrade.`, 403));
    }

    // Try to verify token with Meta API (optional — don't block if it fails)
    let metaVerifiedName = verifiedName || '';
    let connectionStatus = 'connected';
    let webhookVerified = false;

    try {
      const waService = new WhatsAppService(accessToken, phoneNumberId);
      const info = await waService.getPhoneNumberInfo();
      metaVerifiedName = info.verified_name || verifiedName || '';
      webhookVerified = true;
      logger.info(`Meta API verified phone: ${phoneNumberId}`);
    } catch (metaErr) {
      // Log the actual Meta error for debugging
      logger.warn(`Meta API verification skipped for ${phoneNumberId}: ${metaErr.message}`);
      // Still save account but mark as pending verification
      connectionStatus = 'pending';
      metaVerifiedName = verifiedName || '';
    }

    const account = await WhatsappAccount.findOneAndUpdate(
      { phoneNumberId },
      {
        user: req.user._id,
        organization: req.organization._id,
        phoneNumberId,
        wabaId,
        accessToken: encrypt(accessToken),
        displayPhoneNumber,
        verifiedName: metaVerifiedName,
        status: connectionStatus,
        lastVerified: webhookVerified ? new Date() : undefined,
        webhookVerified,
        isActive: true,
        errorMessage: connectionStatus === 'pending'
          ? 'Token could not be verified with Meta. Check your Phone Number ID and Access Token, then use the Verify button.'
          : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const accountObj = account.toObject();
    delete accountObj.accessToken;

    const message = connectionStatus === 'connected'
      ? 'WhatsApp account connected and verified!'
      : 'Account saved. Please verify your credentials using the Verify button.';

    res.status(201).json({ status: 'success', message, data: { account: accountObj } });
  } catch (err) {
    logger.error('Connect WA account error:', err);
    next(err);
  }
};

// Get all connected accounts for user
exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await WhatsappAccount.find({ organization: req.organization._id, isActive: true })
      .select('-accessToken')
      .lean();
    res.status(200).json({ status: 'success', results: accounts.length, data: { accounts } });
  } catch (err) {
    next(err);
  }
};

// Get single account
exports.getAccount = async (req, res, next) => {
  try {
    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id,
    }).select('-accessToken');

    if (!account) return next(new AppError('Account not found.', 404));
    res.status(200).json({ status: 'success', data: { account } });
  } catch (err) {
    next(err);
  }
};

// Verify / re-check connection status
exports.verifyConnection = async (req, res, next) => {
  try {
    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id,
    }).select('+accessToken');

    if (!account) return next(new AppError('Account not found.', 404));

    const waService = new WhatsAppService(decrypt(account.accessToken), account.phoneNumberId);
    const info = await waService.getPhoneNumberInfo();

    account.status = 'connected';
    account.lastVerified = new Date();
    account.verifiedName = info.verified_name;
    account.errorMessage = undefined;
    await account.save();

    const accountObj = account.toObject();
    delete accountObj.accessToken;
    res.status(200).json({ status: 'success', data: { account: accountObj } });
  } catch (err) {
    // Mark as error
    await WhatsappAccount.findByIdAndUpdate(req.params.id, {
      status: 'error',
      errorMessage: err.message,
    });
    next(err);
  }
};

// Disconnect account
exports.disconnectAccount = async (req, res, next) => {
  try {
    const account = await WhatsappAccount.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!account) return next(new AppError('Account not found.', 404));

    account.status = 'disconnected';
    account.isActive = false;
    await account.save();

    res.status(200).json({ status: 'success', message: 'Account disconnected.' });
  } catch (err) {
    next(err);
  }
};
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

    const response = await waService.client.post(`/${account.phoneNumberId}/whatsapp_business_profile`, payload);
    
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
    
    const response = await waService.client.get(`/${account.phoneNumberId}?fields=quality_rating`);
    
    account.qualityRating = response.data.quality_rating;
    await account.save();

    res.status(200).json({ status: 'success', data: { qualityRating: response.data.quality_rating } });
  } catch (err) {
    logger.error('Get Quality Rating error:', err.response?.data || err.message);
    next(new AppError('Failed to fetch quality rating from Meta', 500));
  }
};
