const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const User = require('../models/User');
const Organization = require('../models/Organization');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Store strategies dynamically based on organization
const strategies = new Map();

/**
 * Get or create a SAML strategy for a specific organization
 */
const getSamlStrategy = async (organizationId) => {
  if (strategies.has(organizationId)) {
    return strategies.get(organizationId);
  }

  const org = await Organization.findById(organizationId);
  if (!org || !org.ssoConfig || !org.ssoConfig.enabled) {
    throw new AppError('SSO is not enabled for this organization', 400);
  }

  const strategy = new SamlStrategy(
    {
      path: `/api/auth/saml/callback/${organizationId}`,
      entryPoint: org.ssoConfig.entryPoint,
      issuer: org.ssoConfig.issuer,
      cert: org.ssoConfig.cert, // IDP Public Certificate
    },
    async (profile, done) => {
      try {
        // Find or create user based on SAML profile
        let user = await User.findOne({ email: profile.nameID, organization: organizationId });
        
        if (!user) {
          user = await User.create({
            name: profile.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile.nameID.split('@')[0],
            email: profile.nameID,
            organization: organizationId,
            role: 'agent', // Default role for SSO users
            ssoId: profile.nameID,
            isEmailVerified: true // Inherently verified by SSO
          });
          logger.info(`[SSO] New user provisioned: ${user.email} for Org: ${organizationId}`);
        }

        return done(null, user);
      } catch (err) {
        logger.error('[SSO] Error processing profile:', err);
        return done(err);
      }
    }
  );

  strategies.set(organizationId, strategy);
  return strategy;
};

/**
 * Middleware to initiate SAML Login
 */
exports.ssoLogin = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const strategy = await getSamlStrategy(orgId);
    
    passport.authenticate(strategy, { session: false })(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to handle SAML Callback
 */
exports.ssoCallback = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const strategy = await getSamlStrategy(orgId);
    
    passport.authenticate(strategy, { session: false, failureRedirect: '/login?error=sso_failed' }, (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.redirect('/login?error=sso_unauthorized');

      // Add user to request so controller can generate JWT
      req.user = user;
      next();
    })(req, res, next);
  } catch (err) {
    next(err);
  }
};
