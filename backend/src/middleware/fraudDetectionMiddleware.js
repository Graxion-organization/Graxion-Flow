const fraudDetectionService = require('../services/fraudDetectionService');
const { sendEmail, emailTemplates } = require('../services/emailService');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Strict rate limiter for auth endpoints
const strictAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // High enough to allow the custom Risk Scoring Engine to trigger CAPTCHA/OTP at 5 failed attempts
  message: { status: 'error', message: 'Too many auth attempts from this IP. Please try again after 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware to evaluate request risk score and require additional verification if needed.
 */
const checkFraudRisk = async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const email = req.body?.email || null;
    
    // FingerprintJS compatible validation (client usually sends a hash/id)
    // Fallback to a combination header if not provided
    const deviceId = req.headers['x-device-fingerprint'] || req.headers['x-device-id'] || req.headers['user-agent'];
    const userAgent = req.headers['user-agent'];

    // If there's an authenticated user, attach their ID
    const userId = req.user ? req.user._id : null;

    // Calculate risk score
    const { score, reasons, action } = await fraudDetectionService.calculateRiskScore({
      userId,
      ip,
      email,
      deviceId,
      userAgent
    });

    if (score >= 60) {
      logger.warn(`Fraud Risk [${action.toUpperCase()}] - Score: ${score}, IP: ${ip}, Email: ${email}, Reasons: ${reasons.join(', ')}`);
    }

    // Process the action
    switch (action) {
      case 'block':
        return res.status(403).json({
          status: 'error',
          action: 'block',
          message: 'Access denied due to suspicious activity. IP blocked.',
          riskScore: score
        });

      case 'require_otp':
        // Check if OTP was provided and is valid
        const providedOtp = req.headers['x-otp-code'] || req.body?.otpCode;
        const signedToken = req.headers['x-otp-token'] || req.body?.otpToken;

        if (providedOtp && signedToken) {
          const isValid = await fraudDetectionService.verifyOTP(signedToken, providedOtp);
          if (isValid) {
            return next(); // OTP verified successfully
          }
          return res.status(401).json({
            status: 'fail',
            message: 'Invalid or expired OTP.'
          });
        }
        
        // Generate OTP and return instructions
        const { otp, signedToken: newToken } = await fraudDetectionService.generateOTP(email || ip, ip);
        
        if (email) {
          try {
            const template = emailTemplates.otpChallenge(otp, ip);
            await sendEmail({ to: email, ...template });
            logger.info(`OTP Challenge sent to ${email} for IP ${ip}`);
          } catch (err) {
            logger.error(`Failed to send OTP to ${email}:`, err.message);
          }
        } else {
          logger.info(`DEV ONLY - Generated OTP for IP ${ip}: ${otp} (No email provided)`);
        }

        return res.status(403).json({
          status: 'fail',
          action: 'require_otp',
          message: 'High risk detected. Additional verification required. An OTP has been sent.',
          otpToken: newToken, // Send token to client, client must return this with the code
          riskScore: score
        });

      case 'require_captcha':
        if (req.headers['x-captcha-token'] || req.body?.captchaToken) {
          // Assume token is validated elsewhere (e.g., via reCAPTCHA service)
          return next();
        }
        return res.status(403).json({
          status: 'fail',
          action: 'require_captcha',
          message: 'Please complete the CAPTCHA to continue.',
          riskScore: score
        });

      case 'allow':
      default:
        return next();
    }
  } catch (error) {
    logger.error('Fraud detection middleware error:', error);
    next();
  }
};

module.exports = {
  checkFraudRisk,
  strictAuthLimiter
};
