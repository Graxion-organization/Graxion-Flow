const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AdminSignupRequest = require('../models/AdminSignupRequest');
const AppError = require('../utils/AppError');
const { sendEmail, emailTemplates } = require('../services/emailService');
const fraudDetectionService = require('../services/fraudDetectionService');
const logger = require('../utils/logger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

const sendTokens = (user, statusCode, res) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Match JWT_EXPIRES_IN (7d)
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  const refreshCookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    data: { user },
  });
};

exports.getCsrfToken = (req, res) => {
  const { generateCsrfToken } = require('../middleware/csrf');
  const token = generateCsrfToken(req, res);
  res.status(200).json({ status: 'success', csrfToken: token });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered. Please log in.', 400));

    const user = await User.create({ name, email, password });

    // Create default organization
    const Organization = require('../models/Organization');
    const org = await Organization.create({
      name: `${user.name}'s Workspace`,
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }]
    });

    user.currentOrganization = org._id;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verifyToken = user.createEmailVerifyToken();
    await user.save({ validateBeforeSave: false });

    const template = emailTemplates.verifyEmail(user.name, verifyToken);
    await sendEmail({ to: user.email, ...template });

    sendTokens(user, 201, res);
  } catch (err) {
    logger.error('Register error:', err);
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +subscription +usage');
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!user) {
      await fraudDetectionService.recordFailedLogin(ip, email);
      return next(new AppError('Invalid email or password.', 401));
    }

    const isCorrect = await user.correctPassword(password);
    if (!isCorrect) {
      await fraudDetectionService.recordFailedLogin(ip, email);
      return next(new AppError('Invalid email or password.', 401));
    }

    await fraudDetectionService.recordSuccessfulLogin(ip, email);
    
    // We allow login even if disabled/pending deletion, 
    // but the frontend will redirect them to a special "Pending Deletion" page.
    // However, we mark them as disabled in the response.

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokens(user, 200, res);
  } catch (err) {
    logger.error('Login error:', err);
    next(err);
  }
};

/**
 * SECURE ADMIN REGISTER
 * Requires MASTER_ADMIN_KEY in request body or environment
 */
exports.adminRegister = async (req, res, next) => {
  try {
    const { name, email, password, masterKey } = req.body;

    if (!process.env.MASTER_ADMIN_KEY || !masterKey || masterKey !== process.env.MASTER_ADMIN_KEY) {
      return next(new AppError('Invalid Master Admin Key. Signup denied.', 403));
    }

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered.', 400));

    // Check if there is already a pending request for this email
    const pendingRequest = await AdminSignupRequest.findOne({ email });
    if (pendingRequest) {
      return next(new AppError('A signup request for this email is already pending approval.', 400));
    }

    // Check if any admin users exist in the system (bootstrap seed check)
    const adminExists = await User.exists({ role: 'admin' });

    if (!adminExists) {
      // Seed mode: Instantly register the first admin
      const user = await User.create({ 
        name, 
        email, 
        password, 
        role: 'admin',
        isEmailVerified: true // Auto-verify seed admin
      });

      logger.info(`Bootstrap seed admin registered: ${email}`);
      return sendTokens(user, 201, res);
    }

    // Standard mode: Create a pending AdminSignupRequest
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    await AdminSignupRequest.create({
      name,
      email,
      password: hashedPassword, // Hashed immediately instead of storing in plain text
      status: 'pending'
    });

    res.status(202).json({
      status: 'success',
      message: 'Admin signup request submitted successfully. It will expire in 1 hour if not approved by an existing admin.'
    });
  } catch (err) {
    logger.error('Admin Register error:', err);
    next(err);
  }
};

/**
 * SECURE ADMIN LOGIN
 * Enforces mandatory OTP for every login attempt
 */
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password, otpCode, otpToken } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const user = await User.findOne({ email }).select('+password +role');
    if (!user || user.role !== 'admin') {
      return next(new AppError('Invalid admin credentials.', 401));
    }

    const isCorrect = await user.correctPassword(password);
    if (!isCorrect) {
      return next(new AppError('Invalid admin credentials.', 401));
    }

    // MANDATORY OTP CHECK FOR ADMINS
    if (!otpCode || !otpToken) {
      const { otp, signedToken } = await fraudDetectionService.generateOTP(email, ip);
      
      try {
        const template = {
          subject: '🔒 Admin Security Code',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
              <h2 style="color: #1a73e8; text-align: center;">Admin Verification</h2>
              <p>You are attempting to access the admin portal. Use the following security code to complete your login:</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <b style="font-size: 32px; letter-spacing: 5px; color: #202124;">${otp}</b>
              </div>
              <p style="color: #5f6368; font-size: 13px;">This code will expire in 5 minutes. If you did not attempt this login, please secure your account immediately.</p>
            </div>
          `
        };
        await sendEmail({ to: user.email, ...template });
      } catch (err) {
        logger.error('Admin OTP Email Error:', err.message);
      }

      return res.status(200).json({
        status: 'fail',
        action: 'require_otp',
        message: 'Admin security verification required. Code sent to email.',
        otpToken: signedToken
      });
    }

    // Verify OTP
    const isOtpValid = await fraudDetectionService.verifyOTP(otpToken, otpCode);
    if (!isOtpValid) {
      return next(new AppError('Invalid or expired security code.', 401));
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokens(user, 200, res);
  } catch (err) {
    logger.error('Admin Login error:', err);
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return next(new AppError('No refresh token.', 401));

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError('User not found.', 401));

    const newToken = signToken(user._id);
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };
    res.cookie('token', newToken, cookieOptions);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(new AppError('Invalid refresh token.', 401));
  }
};

exports.logout = async (req, res) => {
  res.cookie('token', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};



exports.verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) return next(new AppError('Token is invalid or has expired.', 400));

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ status: 'success', message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    // Always return same message (security - don't reveal if email exists)
    if (!user) {
      return res.status(200).json({ status: 'success', message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const template = emailTemplates.resetPassword(user.name, resetToken);
      await sendEmail({ to: user.email, ...template });
      logger.info(`Password reset email sent successfully to: ${user.email}`);
    } catch (emailErr) {
      logger.error(`Failed to send password reset email to ${user.email}:`, emailErr);
      // Returning specific error to help debug Vercel issues
      return next(new AppError(`Email delivery failed: ${emailErr.message}`, 500));
    }

    res.status(200).json({ status: 'success', message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('ForgotPassword Global Error:', err);
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return next(new AppError('Token is invalid or has expired.', 400));

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokens(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.requestDeletion = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('User not found.', 404));

    user.isDeletionPending = true;
    user.isAccountDisabled = true;
    user.deletionRequestedAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Optionally send email confirmation here
    try {
      const template = {
        subject: 'Account Deletion Request Received',
        html: `<p>Hi ${user.name},</p><p>We have received your request to delete your account. Your account has been disabled immediately, and all your data will be permanently deleted after 30 days.</p><p>If this was a mistake, please contact our support team immediately.</p>`
      };
      await sendEmail({ to: user.email, ...template });
    } catch (err) {
      logger.error('Failed to send deletion request email:', err);
    }

    res.status(200).json({
      status: 'success',
      message: 'Deletion request received. Your account has been disabled and will be deleted in 30 days.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 1: Send 3 separate OTPs for deletion verification
 */
exports.sendDeletionOTPs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Generate 3 random 4-digit codes
    const otp1 = Math.floor(1000 + Math.random() * 9000).toString();
    const otp2 = Math.floor(1000 + Math.random() * 9000).toString();
    const otp3 = Math.floor(1000 + Math.random() * 9000).toString();

    user.deletionOTP1 = crypto.createHash('sha256').update(otp1).digest('hex');
    user.deletionOTP2 = crypto.createHash('sha256').update(otp2).digest('hex');
    user.deletionOTP3 = crypto.createHash('sha256').update(otp3).digest('hex');
    user.deletionOTPExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Send codes (in one or multiple emails - sending in one for simplicity but labeled as 3 codes)
    try {
      const template = {
        subject: 'Action Required: Account Deletion Verification Codes',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #d32f2f;">Account Deletion Security Verification</h2>
            <p>You have requested to delete your account. To proceed, you must enter the following 3 security codes in order:</p>
            <div style="display: flex; justify-content: space-between; margin: 30px 0;">
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 5px;">
                <small>Code 1</small><br/><b style="font-size: 20px;">${otp1}</b>
              </div>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 5px;">
                <small>Code 2</small><br/><b style="font-size: 20px;">${otp2}</b>
              </div>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 5px;">
                <small>Code 3</small><br/><b style="font-size: 20px;">${otp3}</b>
              </div>
            </div>
            <p style="color: #666; font-size: 13px;">These codes will expire in 15 minutes. If you did not request this, please change your password immediately.</p>
          </div>
        `
      };
      await sendEmail({ to: user.email, ...template });
    } catch (err) {
      logger.error('Failed to send deletion OTPs:', err);
    }

    res.status(200).json({ status: 'success', message: '3 verification codes have been sent to your email.' });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 2: Verify OTPs and Survey, then Process Request
 */
exports.confirmDeletionRequest = async (req, res, next) => {
  try {
    const { otp1, otp2, otp3, reason, feedback } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.deletionOTPExpires || user.deletionOTPExpires < Date.now()) {
      return next(new AppError('Verification codes have expired. Please request new ones.', 400));
    }

    const hashedOtp1 = crypto.createHash('sha256').update(otp1).digest('hex');
    const hashedOtp2 = crypto.createHash('sha256').update(otp2).digest('hex');
    const hashedOtp3 = crypto.createHash('sha256').update(otp3).digest('hex');

    if (user.deletionOTP1 !== hashedOtp1 || user.deletionOTP2 !== hashedOtp2 || user.deletionOTP3 !== hashedOtp3) {
      return next(new AppError('One or more verification codes are incorrect.', 400));
    }

    user.isDeletionPending = true;
    user.isAccountDisabled = true;
    user.deletionRequestedAt = new Date();
    user.deletionReason = reason;
    user.deletionFeedback = feedback;
    
    // Clear OTPs
    user.deletionOTP1 = undefined;
    user.deletionOTP2 = undefined;
    user.deletionOTP3 = undefined;
    user.deletionOTPExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Deletion request processed successfully. Your account is now disabled.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel Deletion Request
 */
exports.cancelDeletionRequest = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.isDeletionPending) {
      return next(new AppError('No pending deletion request found.', 400));
    }

    user.isDeletionPending = false;
    user.isAccountDisabled = false;
    user.deletionRequestedAt = undefined;
    user.deletionReason = undefined;
    user.deletionFeedback = undefined;
    
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Your deletion request has been cancelled and your account is now active.'
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v');
  res.status(200).json({ status: 'success', data: { user } });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, agentCreditLimit, postingCreditLimit } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('User not found.', 404));

    const updateData = {};
    if (name !== undefined) updateData.name = name;

    const maxAllowed = Math.max(0, user.subscription?.credits ?? 0);

    if (agentCreditLimit !== undefined || postingCreditLimit !== undefined) {
      const activeAgentLimit = agentCreditLimit !== undefined ? Math.max(0, parseInt(agentCreditLimit) || 0) : (user.subscription?.agentCreditLimit || 0);
      const activePostingLimit = postingCreditLimit !== undefined ? Math.max(0, parseInt(postingCreditLimit) || 0) : (user.subscription?.postingCreditLimit || 0);

      if (activeAgentLimit > 0 && activeAgentLimit > maxAllowed) {
        return next(new AppError(`Ceiling exceeded: AI Agent Spend Limit (${activeAgentLimit}) cannot exceed your remaining available credits of ${maxAllowed} credits.`, 400));
      }
      if (activePostingLimit > 0 && activePostingLimit > maxAllowed) {
        return next(new AppError(`Ceiling exceeded: Social Posting Spend Limit (${activePostingLimit}) cannot exceed your remaining available credits of ${maxAllowed} credits.`, 400));
      }
      if (activeAgentLimit > 0 && activePostingLimit > 0 && (activeAgentLimit + activePostingLimit) > maxAllowed) {
        return next(new AppError(`Combined Ceiling exceeded: The sum of AI Agent (${activeAgentLimit}) and Social Posting (${activePostingLimit}) limits (${activeAgentLimit + activePostingLimit}) cannot exceed your remaining available credits of ${maxAllowed} credits.`, 400));
      }

      if (agentCreditLimit !== undefined) {
        updateData['subscription.agentCreditLimit'] = activeAgentLimit;
      }
      if (postingCreditLimit !== undefined) {
        updateData['subscription.postingCreditLimit'] = activePostingLimit;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!(await user.correctPassword(currentPassword))) {
      return next(new AppError('Current password is wrong.', 401));
    }

    user.password = newPassword;
    await user.save();
    sendTokens(user, 200, res);
  } catch (err) {
    next(err);
  }
};
