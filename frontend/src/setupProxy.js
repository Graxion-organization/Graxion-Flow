const crypto = require('crypto');

module.exports = function(app) {
  // CSRF token endpoint
  app.get('/api/auth/csrf', (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('_csrfSecret', crypto.randomBytes(32).toString('hex'), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    res.status(200).json({
      status: 'success',
      csrfToken: csrfToken,
    });
  });

  // Public branding settings endpoint
  app.get('/api/admin/settings/public', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        branding_site_name: 'Graxion Flow',
        branding_tagline: 'Premium Social Operations',
        branding_hero_title: 'Manage social without the chaos.',
        branding_hero_subtitle: 'Graxion Flow brings YouTube, Instagram, and WhatsApp into one beautiful workspace. Schedule, reply, and automate—all in one place.',
        branding_contact_email: 'hello@graxion.in',
        branding_contact_phone: '+1 (800) 123-4567',
        branding_footer_text: '© 2026 Graxion. All rights reserved.',
        registration_enabled: true,
      },
    });
  });

  // Feature flags endpoint
  app.get('/api/feature-flags/evaluate', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        flags: {
          enable_ai_agent: true,
          enable_analytics: true,
          enable_workflows: true,
        },
      },
    });
  });
};
