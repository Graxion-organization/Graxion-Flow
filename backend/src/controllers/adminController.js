const User = require('../models/User');
const Conversation = require('../models/Conversation');
const WhatsappAccount = require('../models/WhatsappAccount');
const TelegramAccount = require('../models/TelegramAccount');
const InstagramAccount = require('../models/InstagramAccount');
const SocialPostJob = require('../models/SocialPostJob');
const Agent = require('../models/Agent');
const SystemSetting = require('../models/SystemSetting');
const Payment = require('../models/Payment');
const ContactMessage = require('../models/ContactMessage');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;
const { sendEmail, emailTemplates } = require('../services/emailService');
const crypto = require('crypto');
const creditHelper = require('../utils/creditHelper');
const AdminSignupRequest = require('../models/AdminSignupRequest');
const AdminActivity = require('../models/AdminActivity');
const fraudDetectionService = require('../services/fraudDetectionService');
const { logAdminActivity } = require('../utils/adminLogger');

/**
 * Request an OTP for role change
 */
exports.requestRoleChange = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) return next(new AppError('User not found', 404));
    if (!['user', 'admin'].includes(role)) return next(new AppError('Invalid role', 400));

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Store in target user (for verification context)
    targetUser.roleChangeOTP = hashedOtp;
    targetUser.roleChangeOTPExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    targetUser.pendingRoleAssignment = role;
    await targetUser.save({ validateBeforeSave: false });

    // Send to CURRENT ADMIN (req.user)
    const { subject, html } = emailTemplates.roleAssignmentOtp(otp, targetUser.name, role);
    await sendEmail({ to: req.user.email, subject, html });

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to your administrator email'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm role change with OTP
 */
exports.confirmRoleChange = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) return next(new AppError('User not found', 404));
    if (!targetUser.roleChangeOTP || targetUser.roleChangeOTPExpires < Date.now()) {
      return next(new AppError('OTP expired or not requested', 400));
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedOtp !== targetUser.roleChangeOTP) {
      return next(new AppError('Invalid OTP', 400));
    }

    // Apply change
    const oldRole = targetUser.role;
    targetUser.role = targetUser.pendingRoleAssignment;
    targetUser.roleChangeOTP = undefined;
    targetUser.roleChangeOTPExpires = undefined;
    targetUser.pendingRoleAssignment = undefined;
    
    await targetUser.save({ validateBeforeSave: false });

    // Log administrative role change activity
    await logAdminActivity(req, 'change_user_role', `Updated role of user ${targetUser.email} from ${oldRole} to ${targetUser.role}`);

    res.status(200).json({
      status: 'success',
      message: `User role updated to ${targetUser.role}`,
      data: { user: targetUser }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get overall system statistics
 */
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      newUsers,
      totalMessages,
      whatsappAccounts,
      telegramAccounts,
      instagramAccounts,
      totalAgents,
      humanHandoffs
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$usage.totalMessages' } } }]),
      WhatsappAccount.countDocuments(),
      TelegramAccount.countDocuments(),
      InstagramAccount.countDocuments(),
      Agent.countDocuments(),
      Conversation.countDocuments({ status: 'human_handoff' })
    ]);

    // Plan distribution
    const planStats = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
    ]);

    // Platform distribution
    const platformStats = await Conversation.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          users: { total: totalUsers, new: newUsers },
          messages: { total: totalMessages[0]?.total || 0 },
          accounts: {
            whatsapp: whatsappAccounts,
            telegram: telegramAccounts,
            instagram: instagramAccounts,
            total: whatsappAccounts + telegramAccounts + instagramAccounts
          },
          agents: totalAgents,
          activeHandoffs: humanHandoffs
        },
        plans: planStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        platforms: platformStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    logger.error('Admin stats error:', err);
    next(err);
  }
};

/**
 * Get all users with pagination
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.aggregate([
      { $match: {} },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'whatsappaccounts',
          localField: '_id',
          foreignField: 'user',
          as: 'whatsapp'
        }
      },
      {
        $lookup: {
          from: 'telegramaccounts',
          localField: '_id',
          foreignField: 'user',
          as: 'telegram'
        }
      },
      {
        $lookup: {
          from: 'instagramaccounts',
          localField: '_id',
          foreignField: 'user',
          as: 'instagram'
        }
      },
      {
        $addFields: {
          whatsappCount: { $size: '$whatsapp' },
          telegramCount: { $size: '$telegram' },
          instagramCount: { $size: '$instagram' }
        }
      },
      {
        $project: {
          password: 0,
          whatsapp: 0,
          telegram: 0,
          instagram: 0
        }
      }
    ]);

    const total = await User.countDocuments({});

    res.status(200).json({
      status: 'success',
      results: users.length,
      total,
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get specific user details with their connected accounts
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return next(new AppError('User not found', 404));
    
    const Payment = require('../models/Payment');
    const FacebookAccount = require('../models/FacebookAccount');
    const LinkedInAccount = require('../models/LinkedInAccount');
    const YoutubeAccount = require('../models/YoutubeAccount');
    const CreditTransaction = require('../models/CreditTransaction');
    const FraudEvent = require('../models/FraudEvent');

    const [
      whatsapp,
      telegram,
      instagram,
      facebook,
      linkedin,
      youtube,
      agents,
      payments,
      creditTransactions,
      fraudEvents
    ] = await Promise.all([
      WhatsappAccount.find({ user: user._id }),
      TelegramAccount.find({ user: user._id }),
      InstagramAccount.find({ user: user._id }),
      FacebookAccount.find({ user: user._id }),
      LinkedInAccount.find({ user: user._id }),
      YoutubeAccount.find({ user: user._id }),
      Agent.find({ user: user._id }),
      Payment.find({ user: user._id }).sort({ createdAt: -1 }),
      CreditTransaction.find({ user: user._id }).sort({ createdAt: -1 }),
      FraudEvent.find({ userId: user._id }).sort({ timestamp: -1 })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        accounts: {
          whatsapp,
          telegram,
          instagram,
          facebook,
          linkedin,
          youtube
        },
        agents,
        payments,
        creditTransactions,
        fraudEvents
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user subscription/status
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { plan, status, isActive, credits, messageLimit, agentLimit } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    if (plan) {
      user.subscription.plan = plan;
      const Plan = require('../models/Plan');
      const planObj = await Plan.findOne({ code: plan });
      if (planObj) {
        user.subscription.messageLimit = planObj.messageLimit;
        user.subscription.agentLimit = planObj.agentLimit;
        user.subscription.credits = planObj.credits;
        user.subscription.totalCredits = planObj.credits;

        await creditHelper.logTransaction({
          userId: user._id,
          type: 'addition',
          amount: planObj.credits,
          description: `Admin Overrides: Active plan set to ${planObj.name} by administrator`,
          metadata: { adminId: req.user._id, plan },
        });
      }
    }
    if (status) user.subscription.status = status;
    if (isActive !== undefined) user.isActive = isActive;
    
    if (credits !== undefined) {
      const oldCredits = user.subscription.credits || 0;
      user.subscription.credits = credits;
      user.subscription.totalCredits = credits;

      const difference = credits - oldCredits;
      if (difference !== 0) {
        await creditHelper.logTransaction({
          userId: user._id,
          type: difference > 0 ? 'addition' : 'deduction',
          amount: Math.abs(difference),
          description: `Admin Overrides: Credits balance manually updated by administrator`,
          metadata: { adminId: req.user._id, from: oldCredits, to: credits },
        });
      }
    }
    if (messageLimit !== undefined) user.subscription.messageLimit = messageLimit;
    if (agentLimit !== undefined) user.subscription.agentLimit = agentLimit;

    await user.save({ validateBeforeSave: false });

    // Log administrative user details override activity
    await logAdminActivity(
      req, 
      'update_user', 
      `Manually updated user details for ${user.email} (plan: ${plan || 'unchanged'}, isActive: ${isActive !== undefined ? isActive : 'unchanged'}, credits: ${credits !== undefined ? credits : 'unchanged'})`
    );

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

const { getStats } = require('../middleware/healthMonitor');

/**
 * Get system health and resource usage
 */
exports.getSystemHealth = async (req, res, next) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const monitorStats = getStats();
    
    res.status(200).json({
      status: 'success',
      data: {
        uptime: Math.floor(uptime),
        memory: {
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        monitor: monitorStats,
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get public branding settings
 */
exports.getPublicSettings = async (req, res, next) => {
  try {
    const keys = [
      'branding_site_name',
      'branding_contact_email',
      'branding_contact_phone',
      'branding_logo_url',
      'branding_favicon_url',
      'branding_footer_text',
      'branding_address',
      'branding_address_desc'
    ];
    
    const settings = await SystemSetting.find({ key: { $in: keys } });
    
    const config = {};
    keys.forEach(k => {
      const found = settings.find(s => s.key === k);
      config[k] = found ? found.value : '';
    });
    
    // Provide safe defaults
    if (!config.branding_site_name) config.branding_site_name = 'WhatsAgent';
    if (!config.branding_contact_email) config.branding_contact_email = 'support@whatsappsaas.com';
    if (!config.branding_contact_phone) config.branding_contact_phone = '+1234567890';
    if (!config.branding_footer_text) config.branding_footer_text = ' 2026 WhatsAgent. All rights reserved.';

    res.status(200).json({
      status: 'success',
      data: config
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all system settings
 */
exports.getSystemSettings = async (req, res, next) => {
  try {
    const defaultSettings = [
      { key: 'maintenance_mode', value: false, description: 'Block all non-admin traffic' },
      { key: 'registration_enabled', value: true, description: 'Allow new user signups' },
      { key: 'billing_enabled', value: true, description: 'Enable/Disable Payments/Billing' },
      { key: 'whatsapp_enabled', value: true, description: 'Enable/Disable WhatsApp Service' },
      { key: 'whatsapp_audio_enabled', value: true, description: 'Enable/Disable WhatsApp Audio Replies' },
      { key: 'telegram_enabled', value: true, description: 'Enable/Disable Telegram Service' },
      { key: 'instagram_enabled', value: true, description: 'Enable/Disable Instagram Service' },
      { key: 'instagram_audio_enabled', value: true, description: 'Enable/Disable Instagram Audio Replies' },
      { key: 'ai_responses_enabled', value: true, description: 'Enable/Disable AI Responses' },
      { key: 'global_system_prompt', value: 'You are a helpful AI business assistant.', description: 'Base prompt for all agents' },
      { key: 'openai_api_key', value: '', description: 'System-wide OpenAI API Key' },
      { key: 'anthropic_api_key', value: '', description: 'System-wide Anthropic API Key' },
      { key: 'default_ai_model', value: 'gpt-3.5-turbo', description: 'Fallback model for agents' },
      { key: 'branding_site_name', value: 'WhatsAgent', description: 'Dynamic website/SaaS name' },
      { key: 'branding_contact_email', value: 'support@whatsappsaas.com', description: 'Support email address' },
      { key: 'branding_contact_phone', value: '+1234567890', description: 'Support phone number' },
      { key: 'branding_logo_url', value: '', description: 'Custom logo image URL' },
      { key: 'branding_favicon_url', value: '', description: 'Custom favicon image URL' },
      { key: 'branding_footer_text', value: ' 2026 WhatsAgent. All rights reserved.', description: 'Footer copyright label' },
      { key: 'email_template_welcome_subject', value: 'Welcome to {{siteName}}, {{name}}!', description: 'Welcome email subject' },
      { key: 'email_template_welcome_body', value: 'Hi {{name}},\n\nWelcome to {{siteName}}! We are thrilled to help you automate your client messaging and scaling your operations.\n\nBest regards,\nThe {{siteName}} Team', description: 'Welcome email text body' },
      { key: 'email_template_forgot_password_subject', value: 'Reset your {{siteName}} Password', description: 'Forgot password email subject' },
      { key: 'email_template_forgot_password_body', value: 'Hi {{name}},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n{{resetLink}}\n\nThis link is valid for 10 minutes.\n\nBest regards,\nThe {{siteName}} Team', description: 'Forgot password email text body' },
      { key: 'email_template_deletion_otp_subject', value: 'Account Deletion OTP - {{siteName}}', description: 'Account deletion email subject' },
      { key: 'email_template_deletion_otp_body', value: 'Hi {{name}},\n\nYour account deletion request OTP is: {{otp}}.\n\nThis OTP is valid for 10 minutes. If you did not request this, please contact support immediately.\n\nBest regards,\nThe {{siteName}} Team', description: 'Account deletion email text body' },
      { key: 'lang_en-US_enabled', value: true, description: 'English (US)' },
      { key: 'lang_en-IN_enabled', value: true, description: 'English (India)' },
      { key: 'lang_hi-IN_enabled', value: true, description: 'Hindi' },
      { key: 'lang_es-ES_enabled', value: true, description: 'Spanish' },
      { key: 'lang_fr-FR_enabled', value: false, description: 'French' },
      { key: 'lang_ar-AE_enabled', value: false, description: 'Arabic' },
      { key: 'lang_mr-IN_enabled', value: false, description: 'Marathi' },
      { key: 'lang_bn-IN_enabled', value: false, description: 'Bengali' },
      { key: 'lang_gu-IN_enabled', value: false, description: 'Gujarati' },
      { key: 'lang_ta-IN_enabled', value: false, description: 'Tamil' },
      { key: 'lang_te-IN_enabled', value: false, description: 'Telugu' },
      { key: 'lang_kn-IN_enabled', value: false, description: 'Kannada' },
      { key: 'lang_ml-IN_enabled', value: false, description: 'Malayalam' },
      { key: 'lang_pa-IN_enabled', value: false, description: 'Punjabi' },
      { key: 'lang_ur-IN_enabled', value: false, description: 'Urdu' }
    ];

    let settings = await SystemSetting.find();
    
    // Check if any default settings are missing and add them
    const existingKeys = settings.map(s => s.key);
    const missingSettings = defaultSettings.filter(ds => !existingKeys.includes(ds.key));

    if (missingSettings.length > 0) {
      const newSettings = await SystemSetting.create(missingSettings);
      settings = [...settings, ...newSettings];
    }

    res.status(200).json({
      status: 'success',
      data: { settings }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a system setting
 */
exports.updateSystemSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    
    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    // Log administrative system settings change activity
    await logAdminActivity(req, 'update_setting', `Updated system setting '${key}' to value '${value}'`);

    res.status(200).json({
      status: 'success',
      data: { setting }
    });
  } catch (err) {
    next(err);
  }
};

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Get system logs
 */
exports.getSystemLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs = [];

    const readLogFile = async (filename) => {
      const filePath = path.join(process.cwd(), 'logs', filename);
      if (!fs.existsSync(filePath)) return;
      
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
      
      for await (const line of rl) {
        if (line.trim()) {
          try {
            logs.push({ ...JSON.parse(line), sourceFile: filename });
          } catch (e) {}
        }
      }
    };

    await readLogFile('publish.log');
    await readLogFile('error.log');

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const uniqueLogs = [];
    const seen = new Set();
    for (const log of logs) {
      const key = `${log.timestamp}-${log.level}-${log.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLogs.push(log);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { logs: uniqueLogs.slice(0, limit) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get media files not linked to any post or user
 */
exports.getOrphanMedia = async (req, res, next) => {
  try {
    // 1. Get resources from Cloudinary
    // Defaulting to social_hub folder as defined in cloudinaryService
    const cloudResources = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'social_hub/',
      max_results: 500
    });

    const cloudFiles = cloudResources.resources.map(r => ({
      publicId: r.public_id,
      url: r.secure_url,
      resourceType: r.resource_type,
      createdAt: r.created_at,
      bytes: r.bytes,
      format: r.format
    }));

    // 2. Get all media URLs from SocialPostJob
    const jobs = await SocialPostJob.find({}, 'masterContent.mediaUrls executions.formattedContent.mediaUrls');
    const dbMediaUrls = new Set();
    jobs.forEach(job => {
      // Check masterContent
      if (job.masterContent?.mediaUrls) {
        job.masterContent.mediaUrls.forEach(url => {
          if (url) dbMediaUrls.add(url);
        });
      }
      // Check executions
      if (job.executions) {
        job.executions.forEach(exec => {
          if (exec.formattedContent?.mediaUrls) {
            exec.formattedContent.mediaUrls.forEach(url => {
              if (url) dbMediaUrls.add(url);
            });
          }
        });
      }
    });

    // 3. Find orphans
    const orphans = cloudFiles.filter(file => {
      // Check if any URL in DB contains this publicId
      const isReferenced = Array.from(dbMediaUrls).some(dbUrl => dbUrl && dbUrl.includes(file.publicId));
      return !isReferenced;
    });

    res.status(200).json({
      status: 'success',
      count: orphans.length,
      data: { orphans }
    });
  } catch (err) {
    logger.error('Error fetching orphan media:', err);
    res.status(500).json({
      status: 'error',
      message: 'Could not fetch orphan media. Make sure Cloudinary API is configured correctly.'
    });
  }
};

/**
 * Delete media from Cloudinary
 */
exports.deleteMedia = async (req, res, next) => {
  try {
    const { publicIds } = req.body;
    
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return next(new AppError('Please provide publicIds to delete', 400));
    }

    const result = await cloudinary.api.delete_resources(publicIds);

    res.status(200).json({
      status: 'success',
      data: { result }
    });
  } catch (err) {
    logger.error('Error deleting media:', err);
    next(err);
  }
};

/**
 * Get all users who have requested data deletion
 */
exports.getDeletionRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ isDeletionPending: true })
      .sort({ deletionRequestedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');

    const total = await User.countDocuments({ isDeletionPending: true });

    res.status(200).json({
      status: 'success',
      results: users.length,
      total,
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel a deletion request (restore account)
 */
exports.cancelDeletionRequest = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));

    user.isDeletionPending = false;
    user.isAccountDisabled = false;
    user.deletionRequestedAt = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Deletion request cancelled and account restored.',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

const Plan = require('../models/Plan');

/**
 * Get all subscription plans
 */
exports.getAllPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: { plans }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new subscription plan
 */
exports.createPlan = async (req, res, next) => {
  try {
    const { name, code, price, credits, messageLimit, agentLimit, postCreditCost, agentMsgCreditCost, description, isActive } = req.body;

    if (!name || !code || price === undefined || credits === undefined) {
      return next(new AppError('Please provide name, code, price and credits for the plan', 400));
    }

    const existingPlan = await Plan.findOne({ $or: [{ name }, { code }] });
    if (existingPlan) {
      return next(new AppError('Plan name or code already exists', 400));
    }

    const newPlan = await Plan.create({
      name,
      code,
      price,
      credits,
      messageLimit,
      agentLimit,
      postCreditCost,
      agentMsgCreditCost,
      description,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      status: 'success',
      data: { plan: newPlan }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing subscription plan
 */
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!plan) {
      return next(new AppError('Plan not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { plan }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a subscription plan
 */
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return next(new AppError('Plan not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Plan successfully deleted'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all payment history with advanced filters, pagination, and summary statistics
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { plan, status, search, startDate, endDate } = req.query;

    const query = {};

    // 1. Filter by Plan
    if (plan && plan !== 'all') {
      query.plan = plan;
    }

    // 2. Filter by Status
    if (status && status !== 'all') {
      query.status = status;
    }

    // 3. Filter by Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 4. Filter by Search Query
    if (search) {
      const Payment = require('../models/Payment');
      const mongoose = require('mongoose');

      // We can search by Payment ID, Order ID directly, OR search users by name/email
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);

      const orConditions = [
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { razorpaySubscriptionId: { $regex: search, $options: 'i' } }
      ];

      if (userIds.length > 0) {
        orConditions.push({ user: { $in: userIds } });
      }

      if (mongoose.isValidObjectId(search)) {
        orConditions.push({ _id: search });
        orConditions.push({ user: search });
      }

      query.$or = orConditions;
    }

    const Payment = require('../models/Payment');
    
    // Fetch payments
    const payments = await Payment.find(query)
      .populate('user', 'name email role subscription')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments(query);

    // Calculate aggregated statistics (based on matching filter for total earnings, etc.)
    const allMatchingPayments = await Payment.find(query).select('status amount').lean();
    
    let totalEarnings = 0; // in Paise
    let successCount = 0;
    let failedCount = 0;
    let refundedCount = 0;
    let pendingCount = 0;

    allMatchingPayments.forEach(p => {
      if (p.status === 'captured') {
        totalEarnings += p.amount;
        successCount++;
      } else if (p.status === 'failed') {
        failedCount++;
      } else if (p.status === 'refunded') {
        refundedCount++;
      } else if (p.status === 'created' || p.status === 'authorized') {
        pendingCount++;
      }
    });

    res.status(200).json({
      status: 'success',
      results: payments.length,
      total,
      data: {
        payments,
        stats: {
          totalEarnings: totalEarnings / 100, // in Rupees
          totalTransactions: allMatchingPayments.length,
          successCount,
          failedCount,
          refundedCount,
          pendingCount,
          successRate: allMatchingPayments.length > 0 
            ? Math.round((successCount / allMatchingPayments.length) * 100) 
            : 0
        }
      }
    });
  } catch (err) {
    logger.error('Error fetching payments:', err);
    next(err);
  }
};

/**
 * Manually update payment status (Captured/Failed/Refunded) with admin override
 */
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['created', 'authorized', 'captured', 'failed', 'refunded'].includes(status)) {
      return next(new AppError('Invalid payment status provided', 400));
    }

    const Payment = require('../models/Payment');
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const oldStatus = payment.status;
    payment.status = status;
    await payment.save();

    // If changing status to 'captured' and it wasn't captured before, activate user's subscription
    if (status === 'captured' && oldStatus !== 'captured') {
      const Plan = require('../models/Plan');
      const planInfo = await Plan.findOne({ code: payment.plan });
      if (planInfo) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const targetUser = await User.findById(payment.user);
        if (targetUser) {
          targetUser.subscription.plan = payment.plan;
          targetUser.subscription.status = 'active';
          targetUser.subscription.currentPeriodStart = now;
          targetUser.subscription.currentPeriodEnd = periodEnd;
          targetUser.subscription.messageLimit = planInfo.messageLimit;
          targetUser.subscription.agentLimit = planInfo.agentLimit;
          targetUser.subscription.credits = planInfo.credits;
          targetUser.subscription.totalCredits = planInfo.credits;
          await targetUser.save({ validateBeforeSave: false });

          // Log transaction
          await creditHelper.logTransaction({
            userId: targetUser._id,
            type: 'addition',
            amount: planInfo.credits,
            description: `Manual Activation: Activated ${planInfo.name} tier plan by Administrator override`,
            metadata: { plan: payment.plan, paymentId: payment._id, adminId: req.user._id },
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment status updated successfully',
      data: { payment }
    });
  } catch (err) {
    logger.error('Error updating payment status:', err);
    next(err);
  }
};

/**
 * Simulate or trigger administrative payment refund and revoke active subscription
 */
exports.refundPayment = async (req, res, next) => {
  try {
    const Payment = require('../models/Payment');
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.status === 'refunded') {
      return next(new AppError('Payment has already been refunded', 400));
    }

    payment.status = 'refunded';
    if (!payment.metadata) payment.metadata = {};
    payment.metadata.refundedAt = new Date();
    payment.metadata.refundedBy = req.user._id.toString();
    
    // Save metadata explicitly
    payment.markModified('metadata');
    await payment.save();

    // Revert user's subscription/credits if they match the refunded plan
    const targetUser = await User.findById(payment.user);
    if (targetUser && targetUser.subscription.plan === payment.plan) {
      const oldCredits = targetUser.subscription.credits || 0;
      
      // Degrade plan to free and deduct the plan credits
      const Plan = require('../models/Plan');
      const planInfo = await Plan.findOne({ code: payment.plan });
      
      targetUser.subscription.plan = 'free';
      targetUser.subscription.status = 'cancelled';
      targetUser.subscription.messageLimit = 100;
      targetUser.subscription.agentLimit = 1;
      
      const creditsToDeduct = planInfo ? planInfo.credits : 0;
      targetUser.subscription.credits = Math.max(0, targetUser.subscription.credits - creditsToDeduct);
      await targetUser.save({ validateBeforeSave: false });

      // Log credit transaction
      await creditHelper.logTransaction({
        userId: targetUser._id,
        type: 'deduction',
        amount: Math.min(oldCredits, creditsToDeduct),
        description: `Plan Revoked (Refunded): Deducted ${creditsToDeduct} credits due to administrative refund`,
        metadata: { paymentId: payment._id, adminId: req.user._id },
      });
      
      // Send notification email
      try {
        const { sendEmail, emailTemplates } = require('../services/emailService');
        await sendEmail({
          to: targetUser.email,
          subject: 'Payment Refund Confirmation',
          html: `<p>Hi ${targetUser.name},</p><p>We have processed a refund for your payment (Plan: ${payment.plan.toUpperCase()}) of ${payment.amount / 100}. Your subscription has been reverted to the Free plan. Please let us know if you have any questions.</p><p>Best regards,<br/>The Admin Team</p>`
        });
      } catch (e) {
        logger.error('Error sending refund email:', e);
      }
    }

    // Log administrative payment refund activity
    await logAdminActivity(
      req, 
      'refund_payment', 
      `Refunded payment ${payment.razorpayPaymentId || payment._id} of amount ${payment.amount / 100} for user ${targetUser.email} and revoked subscription`
    );

    res.status(200).json({
      status: 'success',
      message: 'Payment refunded and subscription successfully revoked.',
      data: { payment }
    });
  } catch (err) {
    logger.error('Error refunding payment:', err);
    next(err);
  }
};

/**
 * EXPORT LOG ACTIVITY HELPER
 */
exports.logActivity = async (req, action, details) => {
  return logAdminActivity(req, action, details);
};

/**
 * Get all pending admin signup requests
 */
exports.getSignupRequests = async (req, res, next) => {
  try {
    const requests = await AdminSignupRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: requests.length,
      data: { requests }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send OTP for approving admin signup requests
 */
exports.sendSignupRequestOTP = async (req, res, next) => {
  try {
    const targetRequest = await AdminSignupRequest.findById(req.params.id);
    if (!targetRequest) return next(new AppError('Signup request not found', 404));

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Generate OTP using existing fraudDetectionService
    const { otp, signedToken } = await fraudDetectionService.generateOTP(req.user.email, ip);

    // Send email to approving admin
    try {
      await sendEmail({
        to: req.user.email,
        subject: ' Admin Authorization Code',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #18181b;">
            <h2 style="color: #ef4444; margin-top: 0;">Admin Approval Verification</h2>
            <p>You are attempting to approve a new administrator signup request: <strong>${targetRequest.email}</strong>.</p>
            <p>Please use the following dynamic verification code to complete this secure action:</p>
            <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <b style="font-size: 32px; letter-spacing: 5px; color: #18181b;">${otp}</b>
            </div>
            <p style="color: #71717a; font-size: 13px;">This security code will expire in 5 minutes. If you did not initiate this request, please contact system security immediately.</p>
          </div>
        `
      });
    } catch (err) {
      logger.error('Admin signup request OTP email failed:', err);
      return next(new AppError('Failed to send verification email. Try again.', 500));
    }

    res.status(200).json({
      status: 'success',
      message: 'Security authorization code sent to your email.',
      otpToken: signedToken,
      data: { otpToken: signedToken }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Approve a pending admin signup request
 */
exports.approveSignupRequest = async (req, res, next) => {
  try {
    const { otpCode, otpToken } = req.body;
    if (!otpCode || !otpToken) {
      return next(new AppError('OTP code and token are required.', 400));
    }

    // Verify OTP using existing fraudDetectionService
    const isOtpValid = await fraudDetectionService.verifyOTP(otpToken, otpCode);
    if (!isOtpValid) {
      return next(new AppError('Invalid or expired security code.', 401));
    }

    const signupRequest = await AdminSignupRequest.findById(req.params.id);
    if (!signupRequest) {
      return next(new AppError('Signup request not found or expired.', 404));
    }

    // Double-check email in User DB
    const existing = await User.findOne({ email: signupRequest.email });
    if (existing) {
      await AdminSignupRequest.findByIdAndDelete(req.params.id);
      return next(new AppError('A user with this email is already registered.', 400));
    }

    // Create Admin User
    const newAdmin = await User.create({
      name: signupRequest.name,
      email: signupRequest.email,
      password: signupRequest.password,
      role: 'admin',
      isEmailVerified: true
    });

    // The pre-save hook on User will auto-generate newAdmin.adminAccessKey!
    // Let's delete the request
    await AdminSignupRequest.findByIdAndDelete(req.params.id);

    // Send email to newly approved admin
    try {
      await sendEmail({
        to: newAdmin.email,
        subject: ' Admin Enrollment Approved',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #18181b;">
            <h2 style="color: #25D366; margin-top: 0;">Enrollment Approved!</h2>
            <p>Hi ${newAdmin.name},</p>
            <p>Your request to join the platform as a **System Administrator** has been approved.</p>
            <p>Your unique administrative credential details are below. Keep this key completely secure:</p>
            <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; border: 1px dashed #25D366; color: #18181b; font-weight: bold;">
              Access Key: ${newAdmin.adminAccessKey}
            </div>
            <p>You can now log in at the admin portal using your registered email and password.</p>
            <p style="color: #71717a; font-size: 13px; margin-top: 24px;">WhatsAgent Platform Security Team</p>
          </div>
        `
      });
    } catch (err) {
      logger.error('Error sending admin welcome email:', err);
    }

    // Log activity
    await exports.logActivity(req, 'approve_signup', `Approved admin signup request for ${signupRequest.email} and assigned key ${newAdmin.adminAccessKey}`);

    res.status(200).json({
      status: 'success',
      message: 'Admin signup request approved successfully.',
      data: {
        admin: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          adminAccessKey: newAdmin.adminAccessKey
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject a pending admin signup request
 */
exports.rejectSignupRequest = async (req, res, next) => {
  try {
    const signupRequest = await AdminSignupRequest.findById(req.params.id);
    if (!signupRequest) {
      return next(new AppError('Signup request not found', 404));
    }

    await AdminSignupRequest.findByIdAndDelete(req.params.id);

    // Send email to newly rejected admin
    try {
      await sendEmail({
        to: signupRequest.email,
        subject: 'Admin Enrollment Denied',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #18181b;">
            <h2 style="color: #ef4444; margin-top: 0;">Enrollment Request Denied</h2>
            <p>Hi ${signupRequest.name},</p>
            <p>Your request to enroll as a System Administrator has been reviewed and declined by existing administrators.</p>
            <p>If you believe this is in error, please contact your systems management team.</p>
            <p style="color: #71717a; font-size: 13px; margin-top: 24px;">WhatsAgent Platform Security Team</p>
          </div>
        `
      });
    } catch (err) {
      logger.error('Error sending admin rejection email:', err);
    }

    // Log activity
    await exports.logActivity(req, 'reject_signup', `Rejected admin signup request for ${signupRequest.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Admin signup request rejected and deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all admin audit activities (logs)
 */
exports.getAdminActivities = async (req, res, next) => {
  try {
    const { search, action, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { adminEmail: { $regex: search, $options: 'i' } },
        { adminAccessKey: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }

    if (action) {
      query.action = action;
    }

    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      AdminActivity.find(query).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)),
      AdminActivity.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: { activities }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all registered system routes
 */
exports.getSystemRoutes = async (req, res, next) => {
  try {
    const { extractRoutes } = require('../utils/routeUtils');
    const routes = extractRoutes(req.app);
    res.status(200).json({
      status: 'success',
      results: routes.length,
      data: { routes }
    });
  } catch (err) {
    next(err);
  }
};


/**
 * Instagram Admin Tools
 */
exports.getInstagramAccounts = async (req, res, next) => {
  try {
    const InstagramAccount = require('../models/InstagramAccount');
    const accounts = await InstagramAccount.find({ isActive: true }).populate('user', 'name email').select('+pageAccessToken');
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (err) {
    next(err);
  }
};

exports.getInstagramMedia = async (req, res, next) => {
  try {
    const InstagramAccount = require('../models/InstagramAccount');
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findById(req.params.accountId).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const media = await igService.getMedia();
    res.status(200).json({ status: 'success', data: { media } });
  } catch (err) {
    next(err);
  }
};

exports.getInstagramComments = async (req, res, next) => {
  try {
    const InstagramAccount = require('../models/InstagramAccount');
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findById(req.params.accountId).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const comments = await igService.getMediaComments(req.params.mediaId);
    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

exports.sendInstagramComment = async (req, res, next) => {
  try {
    const { accountId, targetId, text, type } = req.body;
    const InstagramAccount = require('../models/InstagramAccount');
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findById(accountId).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    let result;
    if (type === 'media') {
      result = await igService.postComment(targetId, text);
    } else {
      result = await igService.replyToComment(account.igAccountId, targetId, text);
    }
    res.status(200).json({ status: 'success', data: { result } });
  } catch (err) {
    next(err);
  }
};

exports.triggerInstagramWorker = async (req, res, next) => {
  try {
    const { processUnansweredDMs } = require('../jobs/instagramWorker');
    // Run async so it doesn't block request
    processUnansweredDMs();
    res.status(200).json({ status: 'success', message: 'Instagram worker triggered successfully' });
  } catch (err) {
    next(err);
  }
};

exports.aiAutoReplyPost = async (req, res, next) => {
  try {
    const { accountId, mediaId } = req.body;
    const InstagramAccount = require('../models/InstagramAccount');
    const InstagramService = require('../services/instagramService');
    const AIService = require('../services/aiService');
    const User = require('../models/User');
    const { getIo } = require('../utils/socket');
    
    const account = await InstagramAccount.findById(accountId).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});

    const user = await User.findById(account.user);
    if (!user || user.subscription.credits <= 0) return res.status(400).json({status:'fail', message:'Insufficient credits'});

    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const comments = await igService.getMediaComments(mediaId);

    // Filter comments that need reply
    const pendingComments = comments.filter(c => 
      c.username !== account.igUsername && (!c.replies || !c.replies.data || c.replies.data.length === 0)
    );

    const total = pendingComments.length;
    let processed = 0;

    // Emit initial progress
    try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'started' }); } catch(e){}

    // Run async in background
    (async () => {
      for (const comment of pendingComments) {
        try {
          const agentMock = {
            systemPrompt: account.commentBotPrompt || "You are a helpful assistant.",
            aiProvider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 500
          };

          const aiResponse = await AIService.generate(agentMock, [], comment.text, 'instagram');
          if (aiResponse && aiResponse.content) {
            await new Promise(r => setTimeout(r, 1500)); // Delay for rate limits
            await igService.replyToComment(account.igAccountId, comment.id, aiResponse.content);
            await User.findByIdAndUpdate(account.user, { $inc: { 'subscription.credits': -1, 'usage.totalMessages': 1 } });
          }
        } catch(e) {
          logger.error('AI Auto Reply Comment Error:', e.message);
        }
        
        processed++;
        try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'processing' }); } catch(e){}
      }
      try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'completed' }); } catch(e){}
    })();

    res.status(200).json({ status: 'success', message: 'AI Auto-Reply started in background for this post', totalPending: total });
  } catch (err) {
    next(err);
  }
};

exports.getInstagramStats = async (req, res, next) => {
  try {
    const InstagramAccount = require('../models/InstagramAccount');
    const InstagramService = require('../services/instagramService');
    
    const account = await InstagramAccount.findById(req.params.accountId).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});

    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    
    // Fetch up to 50 recent media
    const mediaList = await igService.getMedia(); // By default fetches a page (usually 25-50 items)
    
    let totalPosts = mediaList.length;
    let totalComments = 0;
    let pendingComments = 0;

    // We process sequentially to avoid rate limit or excessive parallel requests if there are 50 posts.
    // For speed, let's limit to top 20 posts for stats to ensure it doesn't timeout.
    const recentMedia = mediaList.slice(0, 20);

    for (const media of recentMedia) {
      try {
        const comments = await igService.getMediaComments(media.id);
        totalComments += comments.length;
        
        // Count unanswered
        const unanswered = comments.filter(c => 
          c.username !== account.igUsername && (!c.replies || !c.replies.data || c.replies.data.length === 0)
        );
        pendingComments += unanswered.length;
      } catch (e) {
        logger.error('Error fetching comments for media in stats:', e.message);
      }
    }

    res.status(200).json({ 
      status: 'success', 
      data: { 
        postsAnalyzed: recentMedia.length,
        totalComments,
        pendingComments 
      } 
    });
  } catch (err) {
    next(err);
  }
};

exports.getRevenueMetrics = async (req, res, next) => {
  try {
    // Mock MRR / Revenue calculation
    const data = {
      mrr: '$12,450',
      activeSubscriptions: 245,
      churnRate: '2.4%',
      arpu: '$50.81'
    };
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

exports.getWebhookHealth = async (req, res, next) => {
  try {
    const data = {
      totalReceived: 45000,
      successRate: '99.8%',
      failedWebhooks: 90,
      averageLatency: '145ms'
    };
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

exports.getApiUsage = async (req, res, next) => {
  try {
    const data = {
      totalRequests: 1250000,
      rateLimitHits: 450,
      peakTime: '14:00 UTC',
      endpoints: [
        { path: '/api/whatsapp/webhook', count: 450000 },
        { path: '/api/conversations', count: 320000 },
        { path: '/api/flows', count: 180000 }
      ]
    };
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};
 
exports.getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    next(err);
  }
};

exports.markContactMessageRead = async (req, res, next) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found' });
    res.status(200).json({ status: 'success', data: msg });
  } catch (err) {
    next(err);
  }
};
