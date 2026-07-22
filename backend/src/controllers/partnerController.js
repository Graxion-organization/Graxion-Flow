const User = require('../models/User');
const PartnerCommission = require('../models/PartnerCommission');
const SystemSettings = require('../models/SystemSettings');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const crypto = require('crypto');

// Helper to get or create system settings
const getSystemSettings = async () => {
  let settings = await SystemSettings.findOne({ key: 'global_settings' });
  if (!settings) {
    settings = await SystemSettings.create({ key: 'global_settings', defaultPartnerCommissionRate: 20 });
  }
  return settings;
};

// Helper to generate 100% unique partner code
const generateUniquePartnerCode = async () => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = 'SP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const existing = await User.exists({ partnerCode: code });
    if (!existing) isUnique = true;
  }
  return code;
};

// --- SALES PARTNER ENDPOINTS ---

// GET /api/partner/dashboard
exports.getPartnerDashboard = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Ensure partner code exists
  if (!user.partnerCode) {
    user.partnerCode = await generateUniquePartnerCode();
    await user.save({ validateBeforeSave: false });
  }

  // Get referred users
  const referredUsers = await User.find({ referredByPartner: user._id })
    .select('name email createdAt subscription')
    .sort('-createdAt');

  // Get commissions summary
  const commissions = await PartnerCommission.find({ partner: user._id });

  const totalEarned = commissions
    .filter(c => c.status === 'APPROVED' || c.status === 'PAID')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const pendingPayout = commissions
    .filter(c => c.status === 'APPROVED')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const paidOut = commissions
    .filter(c => c.status === 'PAID')
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const settings = await getSystemSettings();

  res.status(200).json({
    status: 'success',
    data: {
      partnerCode: user.partnerCode,
      commissionRate: user.partnerCommissionRate || settings.defaultPartnerCommissionRate,
      commissionType: settings.commissionType,
      minPayoutThreshold: settings.minPayoutThreshold,
      totalReferrals: referredUsers.length,
      totalEarned,
      pendingPayout,
      paidOut,
      referredUsers,
      recentCommissions: commissions.slice(0, 10)
    }
  });
});

// GET /api/partner/payouts
exports.getPartnerPayouts = catchAsync(async (req, res, next) => {
  const commissions = await PartnerCommission.find({ partner: req.user._id })
    .populate('referredUser', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    data: { commissions }
  });
});

// --- ADMIN ENDPOINTS ---

// GET /api/partner/admin/partners
exports.getAllPartners = catchAsync(async (req, res, next) => {
  const partners = await User.find({ role: 'sales_partner' })
    .select('name email role partnerCode partnerCommissionRate createdAt')
    .sort('-createdAt');

  // Populate total earnings for each partner
  const partnerData = await Promise.all(partners.map(async (p) => {
    const referralsCount = await User.countDocuments({ referredByPartner: p._id });
    const commissions = await PartnerCommission.find({ partner: p._id });
    
    const totalEarned = commissions
      .filter(c => c.status === 'APPROVED' || c.status === 'PAID')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const pendingPayout = commissions
      .filter(c => c.status === 'APPROVED')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const paidOut = commissions
      .filter(c => c.status === 'PAID')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return {
      ...p.toObject(),
      referralsCount,
      totalEarned,
      pendingPayout,
      paidOut
    };
  }));

  res.status(200).json({
    status: 'success',
    data: { partners: partnerData }
  });
});

// POST /api/partner/admin/assign-role
exports.assignPartnerRole = catchAsync(async (req, res, next) => {
  const { userId, role, customCommissionRate } = req.body;

  const user = await User.findById(userId);
  if (!user) return next(new AppError('User not found', 404));

  if (role) user.role = role;
  if (customCommissionRate !== undefined) user.partnerCommissionRate = customCommissionRate;

  if (user.role === 'sales_partner' && !user.partnerCode) {
    user.partnerCode = await generateUniquePartnerCode();
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `User ${user.email} updated successfully.`,
    data: { user }
  });
});

// GET /api/partner/admin/settings
exports.getAdminSettings = catchAsync(async (req, res, next) => {
  const settings = await getSystemSettings();
  res.status(200).json({ status: 'success', data: { settings } });
});

// PATCH /api/partner/admin/settings
exports.updateAdminSettings = catchAsync(async (req, res, next) => {
  const { defaultPartnerCommissionRate, commissionType, minPayoutThreshold } = req.body;

  let settings = await SystemSettings.findOne({ key: 'global_settings' });
  if (!settings) {
    settings = new SystemSettings({ key: 'global_settings' });
  }

  if (defaultPartnerCommissionRate !== undefined) settings.defaultPartnerCommissionRate = defaultPartnerCommissionRate;
  if (commissionType) settings.commissionType = commissionType;
  if (minPayoutThreshold !== undefined) settings.minPayoutThreshold = minPayoutThreshold;

  await settings.save();

  res.status(200).json({
    status: 'success',
    message: 'Global partner settings updated.',
    data: { settings }
  });
});

// POST /api/partner/admin/process-payout
exports.processPayout = catchAsync(async (req, res, next) => {
  const { partnerId, payoutTxnId, notes } = req.body;

  if (!partnerId) return next(new AppError('Partner ID is required', 400));

  const pendingCommissions = await PartnerCommission.find({ partner: partnerId, status: 'APPROVED' });

  if (!pendingCommissions.length) {
    return next(new AppError('No pending commissions found for this partner.', 400));
  }

  const paidAt = new Date();
  const updatePromises = pendingCommissions.map(c => {
    c.status = 'PAID';
    c.payoutTxnId = payoutTxnId || `TXN-${Date.now()}`;
    c.paidAt = paidAt;
    if (notes) c.notes = notes;
    return c.save();
  });

  await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    message: `Successfully processed payout for ${pendingCommissions.length} commissions.`
  });
});
