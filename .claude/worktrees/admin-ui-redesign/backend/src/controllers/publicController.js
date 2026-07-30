const ContactMessage = require('../models/ContactMessage');
const SystemSetting = require('../models/SystemSetting');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

exports.submitContactForm = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Save to database
    const newMsg = await ContactMessage.create({
      name,
      email,
      subject,
      message
    });

    // Notify admin
    try {
      const adminEmailSetting = await SystemSetting.findOne({ key: 'branding_contact_email' });
      const adminEmail = adminEmailSetting ? adminEmailSetting.value : process.env.ADMIN_EMAIL || 'support@graxion.com';
      
      const siteNameSetting = await SystemSetting.findOne({ key: 'branding_site_name' });
      const siteName = siteNameSetting ? siteNameSetting.value : 'WhatsAgent';

      // Use the existing email service if possible, or just a simple html payload
      const htmlBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background:#f9f9f9;padding:10px;border-left:5px solid #ccc;">
          ${message}
        </blockquote>
        <p><em>Log into your ${siteName} Admin Panel to manage this message.</em></p>
      `;

      if (sendEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New Contact Submission: ${subject}`,
          html: htmlBody
        });
      }
    } catch (emailErr) {
      logger.error('Failed to send contact notification email:', emailErr);
      // We don't fail the request if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Your message has been sent successfully.'
    });
  } catch (err) {
    next(err);
  }
};
