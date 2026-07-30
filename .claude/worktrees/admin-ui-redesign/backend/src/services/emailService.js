const { Resend } = require('resend');
const logger = require('../utils/logger');
const SystemSetting = require('../models/SystemSetting');

// Initialize Resend with API Key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to compile a dynamic template with database overrides
const compileDynamicTemplate = async (templateKey, placeholders, fallbackSubject, fallbackHtml) => {
  try {
    // 1. Fetch site name dynamically for branding
    const siteNameSetting = await SystemSetting.findOne({ key: 'branding_site_name' });
    const siteName = siteNameSetting ? siteNameSetting.value : 'WhatsAgent';
    
    const contactEmailSetting = await SystemSetting.findOne({ key: 'branding_contact_email' });
    const contactEmail = contactEmailSetting ? contactEmailSetting.value : 'support@whatsappsaas.com';

    const contactPhoneSetting = await SystemSetting.findOne({ key: 'branding_contact_phone' });
    const contactPhone = contactPhoneSetting ? contactPhoneSetting.value : '+1234567890';

    const footerTextSetting = await SystemSetting.findOne({ key: 'branding_footer_text' });
    const footerText = footerTextSetting ? footerTextSetting.value : '© 2026 WhatsAgent. All rights reserved.';

    const logoSetting = await SystemSetting.findOne({ key: 'branding_logo_url' });
    const logoUrl = logoSetting ? logoSetting.value : '';

    // Merge default placeholders
    const allPlaceholders = {
      siteName,
      contactEmail,
      contactPhone,
      footerText,
      logoUrl,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      ...placeholders
    };

    // 2. Fetch templates from DB
    const subjectSetting = await SystemSetting.findOne({ key: `email_template_${templateKey}_subject` });
    const bodySetting = await SystemSetting.findOne({ key: `email_template_${templateKey}_body` });

    let subject = subjectSetting ? subjectSetting.value : fallbackSubject;
    let body = bodySetting ? bodySetting.value : fallbackHtml;

    // 3. Compile placeholders using regex: replacing {{key}}
    const replaceAll = (str, dict) => {
      if (!str) return '';
      return str.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
        return dict[p1] !== undefined ? dict[p1] : match;
      });
    };

    subject = replaceAll(subject, allPlaceholders);
    body = replaceAll(body, allPlaceholders);

    // If it's a raw body, wrap it in a gorgeous default HTML layout container with dynamic logo and footer!
    if (!body.includes('<div') && !body.includes('<html')) {
      body = `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e4e4e7;border-radius:12px;padding:24px;color:#18181b;">
        ${logoUrl ? `<div style="text-align:center;margin-bottom:20px;"><img src="${logoUrl}" alt="${siteName}" style="max-height:50px;"/></div>` : ''}
        <h2 style="color:#25D366;margin-top:0;">${subject}</h2>
        <div style="font-size:16px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${body}</div>
        <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;"/>
        <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-bottom:0;">${footerText}</p>
      </div>`;
    }

    return { subject, html: body };
  } catch (err) {
    logger.error('Error compiling dynamic email template:', err);
    // Return original fallback
    return { subject: fallbackSubject, html: fallbackHtml };
  }
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    let finalSubject = subject;
    let finalHtml = html;
    let templateKey = null;
    let placeholders = {};

    if (subject) {
      if (subject.toLowerCase().includes('welcome')) {
        templateKey = 'welcome';
        const match = html.match(/Welcome,\s*([^!<]+)/);
        placeholders.name = match ? match[1].trim() : 'User';
      } else if (subject.includes('Admin Authorization Code')) {
        templateKey = 'adminSignupOtp';
        const matchOtp = html.match(/>\s*([0-9A-Za-z]{6,8})\s*</) || html.match(/<b>([0-9A-Za-z]{6,8})<\/b>/);
        placeholders.otp = matchOtp ? matchOtp[1].trim() : '';
        const matchEmail = html.match(/request:\s*<strong>([^<]+)/);
        placeholders.targetEmail = matchEmail ? matchEmail[1].trim() : '';
      } else if (subject.includes('Admin Enrollment Approved')) {
        templateKey = 'adminSignupApproved';
        const matchName = html.match(/Hi\s*([^,]+)/);
        placeholders.name = matchName ? matchName[1].trim() : 'Admin';
        const matchKey = html.match(/Access Key:\s*([^\s<]+)/);
        placeholders.accessKey = matchKey ? matchKey[1].trim() : '';
      } else if (subject.toLowerCase().includes('verify')) {
        templateKey = 'verifyEmail';
        const matchName = html.match(/Hi\s*([^,]+)/);
        placeholders.name = matchName ? matchName[1].trim() : 'User';
        const matchToken = html.match(/token=([^"&]+)/);
        placeholders.token = matchToken ? matchToken[1] : '';
        placeholders.verifyLink = placeholders.token ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${placeholders.token}` : '';
      } else if (subject.toLowerCase().includes('reset')) {
        templateKey = 'resetPassword';
        const matchName = html.match(/Hi\s*([^,]+)/);
        placeholders.name = matchName ? matchName[1].trim() : 'User';
        const matchToken = html.match(/token=([^"&]+)/);
        placeholders.token = matchToken ? matchToken[1] : '';
        placeholders.resetLink = placeholders.token ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${placeholders.token}` : '';
      } else if (subject.toLowerCase().includes('subscription') || subject.toLowerCase().includes('activated')) {
        templateKey = 'subscriptionConfirmed';
        const matchName = html.match(/Hi\s*([^,]+)/);
        placeholders.name = matchName ? matchName[1].trim() : 'User';
        const matchPlan = html.match(/your\s*([^\s]+)\s*plan/);
        placeholders.plan = matchPlan ? matchPlan[1] : 'Premium';
      } else if (subject.toLowerCase().includes('security') || subject.toLowerCase().includes('otp') || subject.toLowerCase().includes('verification')) {
        templateKey = 'otpChallenge';
        const matchOtp = html.match(/>\s*([0-9A-Za-z]{6,8})\s*</) || html.match(/otp challenge/i);
        placeholders.otp = matchOtp ? matchOtp[1].trim() : '';
        const matchIp = html.match(/IP address:\s*<strong>([^<]+)/);
        placeholders.ip = matchIp ? matchIp[1].trim() : 'Unknown IP';
      } else if (subject.toLowerCase().includes('role')) {
        templateKey = 'roleAssignmentOtp';
        const matchOtp = html.match(/>\s*([0-9A-Za-z]{6,8})\s*</);
        placeholders.otp = matchOtp ? matchOtp[1].trim() : '';
        const matchUser = html.match(/change the role of\s*<strong>([^<]+)/);
        placeholders.targetUserName = matchUser ? matchUser[1].trim() : 'User';
        const matchRole = html.match(/to\s*<strong>([^<]+)/);
        placeholders.newRole = matchRole ? matchRole[1].trim() : 'Admin';
      }
    }

    if (templateKey) {
      const compiled = await compileDynamicTemplate(templateKey, placeholders, subject, html);
      finalSubject = compiled.subject;
      finalHtml = compiled.html;
    }

    if (!resend) {
      logger.warn('RESEND_API_KEY is missing. Email not sent, logging for debug:');
      logger.info(`To: ${to}, Subject: ${finalSubject}`);
      return;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [to],
      subject: finalSubject,
      html: finalHtml,
    });

    if (error) {
      logger.error('Resend SMTP Error:', error);
      throw new Error(error.message);
    }

    logger.info(`Email sent successfully via Resend. ID: ${data?.id}`);
  } catch (err) {
    logger.error('Email send failed:', err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
};

const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to WhatsAgent!',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Welcome, ${name}!</h2>
      <p>Your account has been created. Start by connecting your WhatsApp number.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#25D366;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Go to Dashboard</a>
    </div>`,
  }),

  verifyEmail: (name, token) => ({
    subject: 'Verify your email',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Hi ${name}, verify your email</h2>
      <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}" style="background:#25D366;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Verify Email</a>
      <p>Link expires in 24 hours.</p>
    </div>`,
  }),

  resetPassword: (name, token) => ({
    subject: 'Reset your password',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Hi ${name},</h2>
      <p>Click below to reset your password. Link expires in 1 hour.</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Reset Password</a>
    </div>`,
  }),

  subscriptionConfirmed: (name, plan) => ({
    subject: 'Subscription Activated!',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Hi ${name}, your ${plan} plan is active!</h2>
      <p>You can now use all features. Thank you for subscribing.</p>
    </div>`,
  }),

  otpChallenge: (otpCode, ip) => ({
    subject: 'Security Alert: Login Verification Required',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Security Verification Required</h2>
      <p>We detected a suspicious login attempt from IP address: <strong>${ip}</strong></p>
      <p>To verify it's you, please use the following One-Time Password (OTP):</p>
      <div style="background:#f4f4f5;padding:20px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#18181b;border-radius:12px;margin:24px 0;">
        ${otpCode}
      </div>
      <p style="color:#71717a;font-size:14px;">This code expires in 5 minutes. If this wasn't you, please reset your password immediately.</p>
    </div>`,
  }),

  roleAssignmentOtp: (otpCode, targetUserName, newRole) => ({
    subject: 'Action Required: Confirm User Role Assignment',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e4e4e7;border-radius:12px;padding:24px;">
      <h2 style="color:#18181b;">Confirm Role Change</h2>
      <p>You are about to change the role of <strong>${targetUserName}</strong> to <strong>${newRole.toUpperCase()}</strong>.</p>
      <p>To confirm this administrative action, please use the following verification code:</p>
      <div style="background:#f4f4f5;padding:20px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:bold;color:#18181b;border-radius:12px;margin:24px 0;border:2px dashed #25D366;">
        ${otpCode}
      </div>
      <p style="color:#71717a;font-size:14px;">This code will expire in 10 minutes. If you did not initiate this request, please ignore this email.</p>
      <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;"/>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;">Secure Admin Action • WhatsAgent Platform</p>
    </div>`,
  }),

  adminSignupOtp: (otpCode, targetEmail) => ({
    subject: '🔒 Admin Authorization Code',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e4e4e7;border-radius:12px;padding:24px;color:#18181b;">
      <h2 style="color:#ef4444;margin-top:0;">Admin Approval Verification</h2>
      <p>You are attempting to approve a new administrator signup request: <strong>${targetEmail}</strong>.</p>
      <p>Please use the following dynamic verification code to complete this secure action:</p>
      <div style="background:#f4f4f5;padding:20px;text-align:center;font-size:32px;letter-spacing:5px;font-weight:bold;color:#18181b;border-radius:12px;margin:24px 0;border:2px dashed #ef4444;">
        ${otpCode}
      </div>
      <p style="color:#71717a;font-size:14px;">This security code will expire in 5 minutes. If you did not initiate this request, please contact system security immediately.</p>
      <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;"/>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;">Secure Admin Action • WhatsAgent Platform</p>
    </div>`,
  }),

  adminSignupApproved: (name, accessKey) => ({
    subject: '🎉 Admin Enrollment Approved',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e4e4e7;border-radius:12px;padding:24px;color:#18181b;">
      <h2 style="color:#25D366;margin-top:0;">Enrollment Approved!</h2>
      <p>Hi ${name},</p>
      <p>Your request to join the platform as a **System Administrator** has been approved.</p>
      <p>Your unique administrative credential details are below. Keep this key completely secure:</p>
      <div style="background:#f4f4f5;padding:16px;border-radius:8px;font-family:monospace;font-size:18px;text-align:center;margin:20px 0;border:1px dashed #25D366;color:#18181b;font-weight:bold;">
        Access Key: ${accessKey}
      </div>
      <p>You can now log in at the admin portal using your registered email and password.</p>
      <hr style="border:0;border-top:1px solid #e4e4e7;margin:24px 0;"/>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;">WhatsAgent Platform Security Team</p>
    </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
