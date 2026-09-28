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

  // User auth profile mock for dev preview
  app.get('/api/auth/me', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: 'usr_demo_101',
          name: 'Graxion Admin',
          email: 'admin@graxion.in',
          role: 'admin',
          currentOrganization: 'org_main_01',
          subscription: {
            plan: 'enterprise',
            status: 'active',
            currentPeriodEnd: '2026-12-31T23:59:59Z'
          }
        }
      }
    });
  });

  // Agency overview data for Dashboard
  app.get('/api/analytics/agency-overview', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        globalQuota: {
          messagesLimit: 50000,
          messagesUsed: 14820,
          creditsTotal: 100000,
          creditsUsed: 28450,
        },
        organizations: [
          {
            _id: 'org_1',
            name: 'Apex Global Retail',
            slug: 'apex-global',
            messages: 6420,
            tokens: 184500,
            conversations: 1240,
          },
          {
            _id: 'org_2',
            name: 'NovaTech Solutions',
            slug: 'novatech',
            messages: 4180,
            tokens: 122400,
            conversations: 890,
          },
          {
            _id: 'org_3',
            name: 'UrbanStyle E-commerce',
            slug: 'urbanstyle',
            messages: 2850,
            tokens: 76200,
            conversations: 630,
          },
          {
            _id: 'org_4',
            name: 'Solace Healthcare',
            slug: 'solace-health',
            messages: 1370,
            tokens: 39100,
            conversations: 280,
          }
        ]
      }
    });
  });

  // Organizations list
  app.get('/api/organizations', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        organizations: [
          { _id: 'org_1', name: 'Apex Global Retail', slug: 'apex-global', role: 'admin' },
          { _id: 'org_2', name: 'NovaTech Solutions', slug: 'novatech', role: 'admin' },
          { _id: 'org_3', name: 'UrbanStyle E-commerce', slug: 'urbanstyle', role: 'member' }
        ]
      }
    });
  });

  // Notifications endpoint
  app.get('/api/notifications', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: { notifications: [] }
    });
  });

  app.get('/api/notifications/unread-count', (req, res) => {
    res.status(200).json({
      status: 'success',
      count: 0
    });
  });

  // Analytics & traffic tracking endpoints
  app.post(['/api/public/track', '/api/analytics/track'], (req, res) => {
    res.status(200).json({
      status: 'success',
      tracked: true,
    });
  });

  // Catch-all for any other /api/* route: ALWAYS return JSON, NEVER index.html!
  app.use('/api', (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {}
    });
  });
};

