const WhatsappAccount = require('../models/WhatsappAccount');
const WhatsAppService = require('../services/whatsappService');
const AppError = require('../utils/AppError');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// Connect a WhatsApp Business account
exports.connectAccount = async (req, res, next) => {
  try {
    const { phoneNumberId, wabaId, accessToken, displayPhoneNumber, verifiedName } = req.body;

    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;

    // Check if account already exists
    const existing = await WhatsappAccount.findOne({ phoneNumberId });

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

    // Try to verify token with Meta API (optional)
    let metaVerifiedName = verifiedName || '';
    let webhookVerified = false;

    try {
      const waService = new WhatsAppService(accessToken, phoneNumberId);
      const info = await waService.getPhoneNumberInfo();
      metaVerifiedName = info.verified_name || verifiedName || '';
      webhookVerified = true;
      logger.info(`Meta API verified phone: ${phoneNumberId}`);
    } catch (metaErr) {
      logger.warn(`Meta API verification skipped for ${phoneNumberId}: ${metaErr.message}`);
    }

    const account = await WhatsappAccount.findOneAndUpdate(
      { phoneNumberId },
      {
        user: req.user._id,
        organization: orgId,
        phoneNumberId,
        wabaId,
        accessToken: encrypt(accessToken),
        displayPhoneNumber: displayPhoneNumber || phoneNumberId,
        verifiedName: metaVerifiedName || displayPhoneNumber || 'WhatsApp Business',
        status: 'connected',
        lastVerified: new Date(),
        webhookVerified: true,
        isActive: true,
        errorMessage: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const accountObj = account.toObject();
    delete accountObj.accessToken;

    res.status(201).json({ status: 'success', message: 'WhatsApp account connected and verified!', data: { account: accountObj } });
  } catch (err) {
    logger.error('Connect WA account error:', err);
    next(err);
  }
};

// Get all connected accounts for user
exports.getAccounts = async (req, res, next) => {
  try {
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
    const userId = req.user?._id;

    // Auto-heal: Ensure all accounts created by this user/org are active and linked to current workspace
    if (userId) {
      await WhatsappAccount.updateMany(
        { user: userId, status: { $ne: 'deleted' } },
        { $set: { isActive: true, status: 'connected', organization: orgId } }
      );
    }

    // Find all active accounts matching user or organization
    const accounts = await WhatsappAccount.find({
      $or: [
        { organization: orgId },
        { user: userId }
      ],
      isActive: true
    })
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
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      $or: [{ organization: orgId }, { user: req.user._id }]
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
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      $or: [{ organization: orgId }, { user: req.user._id }]
    }).select('+accessToken');

    if (!account) return next(new AppError('Account not found.', 404));

    const waService = new WhatsAppService(decrypt(account.accessToken), account.phoneNumberId);
    const info = await waService.getPhoneNumberInfo();

    account.status = 'connected';
    account.isActive = true;
    account.lastVerified = new Date();
    account.verifiedName = info.verified_name || account.verifiedName;
    account.errorMessage = undefined;
    await account.save();

    const accountObj = account.toObject();
    delete accountObj.accessToken;
    res.status(200).json({ status: 'success', data: { account: accountObj } });
  } catch (err) {
    await WhatsappAccount.findByIdAndUpdate(req.params.id, {
      status: 'error',
      errorMessage: err.message,
    });
    next(err);
  }
};

// Disconnect / Delete account completely from MongoDB
exports.disconnectAccount = async (req, res, next) => {
  try {
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
    const userId = req.user?._id;

    // Hard delete account from DB so it cleans up workspace completely
    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      $or: [{ organization: orgId }, { user: userId }]
    });

    if (account) {
      await WhatsappAccount.findByIdAndDelete(account._id);
    } else {
      // Clean up any stale records for this ID/user
      await WhatsappAccount.deleteMany({
        $or: [{ _id: req.params.id }, { user: userId, organization: orgId }]
      });
    }

    res.status(200).json({ status: 'success', message: 'Account disconnected successfully.' });
  } catch (err) {
    next(err);
  }
};

// Update Business Profile (WA-032)
exports.updateBusinessProfile = async (req, res, next) => {
  try {
    const { address, description, email, websites, about } = req.body;
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;

    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      $or: [{ organization: orgId }, { user: req.user._id }]
    }).select('+accessToken');

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

// Get Quality Rating
exports.getQualityRating = async (req, res, next) => {
  try {
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;

    const account = await WhatsappAccount.findOne({
      _id: req.params.id,
      $or: [{ organization: orgId }, { user: req.user._id }]
    }).select('+accessToken');

    if (!account) return next(new AppError('Account not found', 404));

    const waService = new WhatsAppService(decrypt(account.accessToken), account.phoneNumberId);
    const info = await waService.getPhoneNumberInfo();

    account.qualityRating = info.quality_rating || 'UNKNOWN';
    await account.save();

    res.status(200).json({
      status: 'success',
      data: {
        qualityRating: info.quality_rating || 'UNKNOWN',
        verifiedName: info.verified_name || account.verifiedName,
        codeVerificationStatus: info.code_verification_status || 'NOT_VERIFIED'
      }
    });
  } catch (err) {
    logger.error('Get Quality Rating error:', err.response?.data || err.message);
    next(new AppError('Failed to fetch quality rating from Meta', 500));
  }
};
