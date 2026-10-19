const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const DeveloperServiceClient = require('../../models/DeveloperServiceClient');
const Organization = require('../../models/Organization');
const { sendDeveloperError } = require('./requestContext');

// In-memory revocation cache (supplements DB revokedTokenJtis for immediate revocation)
const revokedJtiSet = new Set();
const runtimeSecretRotationState = {
  currentSecret: null,
  previousSecret: null,
  previousSecretExpiresAt: null,
  rotatedAt: null
};

function getSigningSecret() {
  return (
    process.env.DEVELOPER_JWT_SECRET ||
    process.env.DEVELOPER_MGMT_CLIENT_SECRET ||
    process.env.JWT_SECRET ||
    'dev_s2s_fallback_signing_secret_do_not_use_in_prod'
  );
}

function getEnvManagementClient() {
  const clientId = process.env.DEVELOPER_MGMT_CLIENT_ID;
  const envSecret = runtimeSecretRotationState.currentSecret || process.env.DEVELOPER_MGMT_CLIENT_SECRET;
  if (!clientId || !envSecret) return null;

  const prevSecret =
    runtimeSecretRotationState.previousSecret || process.env.DEVELOPER_MGMT_SECRET_PREVIOUS || null;
  const prevExpires =
    runtimeSecretRotationState.previousSecretExpiresAt ||
    (process.env.DEVELOPER_MGMT_SECRET_PREVIOUS_EXPIRES_AT
      ? new Date(process.env.DEVELOPER_MGMT_SECRET_PREVIOUS_EXPIRES_AT)
      : new Date(Date.now() + 24 * 60 * 60 * 1000));

  const scopesRaw = process.env.DEVELOPER_MGMT_SCOPES || '*';
  const scopes = scopesRaw.split(',').map((s) => s.trim()).filter(Boolean);

  const allowedIpsRaw = process.env.DEVELOPER_MGMT_ALLOWED_IPS || '';
  const allowedIps = allowedIpsRaw.split(',').map((s) => s.trim()).filter(Boolean);

  return {
    clientId,
    name: 'Graxion Developer Management System (Env Bootstrap)',
    secret: envSecret,
    previousSecret: prevSecret,
    previousSecretExpiresAt: prevExpires,
    scopes,
    allowedOrganizations: [],
    allowedIps,
    rateLimitPerMinute: parseInt(process.env.DEVELOPER_MGMT_RATE_LIMIT || '600', 10),
    isActive: true,
    isRevoked: process.env.DEVELOPER_MGMT_REVOKED === 'true'
  };
}

function timingSafeCompareStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Verify client credentials against DB or environment bootstrap configuration
 */
async function verifyClientCredentials(clientId, clientSecret) {
  if (!clientId || !clientSecret) return { valid: false, reason: 'MISSING_CREDENTIALS' };

  // 1. Check Env Bootstrap Client first
  const envClient = getEnvManagementClient();
  if (envClient && timingSafeCompareStrings(clientId, envClient.clientId)) {
    if (envClient.isRevoked || !envClient.isActive) {
      return { valid: false, reason: 'CLIENT_REVOKED' };
    }
    const matchesCurrent = timingSafeCompareStrings(clientSecret, envClient.secret);
    const matchesPrevious =
      envClient.previousSecret &&
      envClient.previousSecretExpiresAt &&
      new Date(envClient.previousSecretExpiresAt) > new Date() &&
      timingSafeCompareStrings(clientSecret, envClient.previousSecret);

    if (matchesCurrent || matchesPrevious) {
      return {
        valid: true,
        client: {
          clientId: envClient.clientId,
          name: envClient.name,
          scopes: envClient.scopes,
          allowedOrganizations: envClient.allowedOrganizations,
          allowedIps: envClient.allowedIps,
          rateLimitPerMinute: envClient.rateLimitPerMinute,
          source: 'env'
        }
      };
    }
    return { valid: false, reason: 'INVALID_SECRET' };
  }

  // 2. Check Database DeveloperServiceClient
  if (typeof DeveloperServiceClient.findOne === 'function') {
    try {
      const dbClient = await DeveloperServiceClient.findOne({ clientId }).select(
        '+secretHash +previousSecretHash'
      );
      if (!dbClient) {
        return { valid: false, reason: 'UNKNOWN_CLIENT' };
      }
      if (dbClient.isRevoked || !dbClient.isActive) {
        return { valid: false, reason: 'CLIENT_REVOKED' };
      }
      if (!dbClient.verifySecret(clientSecret)) {
        return { valid: false, reason: 'INVALID_SECRET' };
      }

      dbClient.lastUsedAt = new Date();
      await dbClient.save().catch(() => {});

      return {
        valid: true,
        client: {
          _id: dbClient._id,
          clientId: dbClient.clientId,
          name: dbClient.name,
          scopes: dbClient.scopes,
          allowedOrganizations: dbClient.allowedOrganizations || [],
          allowedIps: dbClient.allowedIps || [],
          rateLimitPerMinute: dbClient.rateLimitPerMinute || 600,
          revokedTokenJtis: dbClient.revokedTokenJtis || [],
          source: 'db'
        }
      };
    } catch (_) {
      return { valid: false, reason: 'AUTH_LOOKUP_FAILED' };
    }
  }

  return { valid: false, reason: 'UNKNOWN_CLIENT' };
}

/**
 * Issue short-lived S2S OAuth 2.0 Client Credentials JWT
 */
function issueS2SToken(client, requestedScopes = null) {
  let grantedScopes = client.scopes || ['*'];
  if (Array.isArray(requestedScopes) && requestedScopes.length > 0) {
    if (!grantedScopes.includes('*')) {
      const unauthorized = requestedScopes.filter((s) => !grantedScopes.includes(s));
      if (unauthorized.length > 0) {
        return { error: `Requested scopes exceed client privileges: ${unauthorized.join(', ')}` };
      }
    }
    grantedScopes = requestedScopes;
  }

  const jti = `jti_${crypto.randomBytes(12).toString('hex')}`;
  const expiresIn = parseInt(process.env.DEVELOPER_TOKEN_TTL_SECONDS || '3600', 10);

  const token = jwt.sign(
    {
      sub: client.clientId,
      name: client.name,
      typ: 'developer_s2s',
      scopes: grantedScopes,
      allowedOrganizations: (client.allowedOrganizations || []).map((id) => String(id)),
      rateLimitPerMinute: client.rateLimitPerMinute || 600,
      jti
    },
    getSigningSecret(),
    {
      expiresIn,
      issuer: 'graxion-flow-developer-api',
      audience: 'graxion-developer-management-system'
    }
  );

  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: grantedScopes.join(' '),
    jti
  };
}

/**
 * Middleware: Authenticate private S2S Management System request
 */
async function authenticateDeveloperService(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const headerClientId = req.headers['x-developer-client-id'];
    const headerClientSecret = req.headers['x-developer-client-secret'];

    let resolvedClient = null;

    // Flow A: Bearer S2S OAuth Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (!token) {
        return sendDeveloperError(req, res, 401, 'UNAUTHORIZED', 'Bearer token is empty.');
      }

      let decoded;
      try {
        decoded = jwt.verify(token, getSigningSecret(), {
          issuer: 'graxion-flow-developer-api',
          audience: 'graxion-developer-management-system'
        });
      } catch (err) {
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        return sendDeveloperError(req, res, 401, code, 'Invalid or expired S2S access token.');
      }

      if (decoded.typ !== 'developer_s2s' || !decoded.sub) {
        return sendDeveloperError(
          req,
          res,
          401,
          'INVALID_TOKEN_TYPE',
          'User session tokens are not accepted on the private Developer Management API.'
        );
      }

      if (decoded.jti && revokedJtiSet.has(decoded.jti)) {
        return sendDeveloperError(req, res, 401, 'TOKEN_REVOKED', 'This S2S access token has been revoked.');
      }

      // Check if client is revoked in env or DB
      const envClient = getEnvManagementClient();
      const canQueryDb =
        mongoose.connection?.readyState === 1 ||
        Boolean(DeveloperServiceClient.findOne && DeveloperServiceClient.findOne._isMockFunction);

      if (envClient && decoded.sub === envClient.clientId) {
        if (envClient.isRevoked) {
          return sendDeveloperError(req, res, 401, 'CLIENT_REVOKED', 'S2S service client has been revoked.');
        }
      } else if (canQueryDb && typeof DeveloperServiceClient.findOne === 'function') {
        try {
          const dbClient = await DeveloperServiceClient.findOne({ clientId: decoded.sub }).lean();
          if (dbClient) {
            if (dbClient.isRevoked || !dbClient.isActive) {
              return sendDeveloperError(req, res, 401, 'CLIENT_REVOKED', 'S2S service client has been revoked.');
            }
            if (decoded.jti && Array.isArray(dbClient.revokedTokenJtis) && dbClient.revokedTokenJtis.includes(decoded.jti)) {
              return sendDeveloperError(req, res, 401, 'TOKEN_REVOKED', 'This S2S access token has been revoked.');
            }
          }
        } catch (_) {
          // Ignore DB lookup failure if running statelessly
        }
      }

      resolvedClient = {
        clientId: decoded.sub,
        name: decoded.name || 'S2S Client',
        scopes: decoded.scopes || [],
        allowedOrganizations: decoded.allowedOrganizations || [],
        rateLimitPerMinute: decoded.rateLimitPerMinute || 600,
        jti: decoded.jti,
        authMethod: 'oauth2_client_credentials'
      };
    }
    // Flow B: Direct S2S Header Credentials
    else if (headerClientId && headerClientSecret) {
      const verification = await verifyClientCredentials(
        String(headerClientId),
        String(headerClientSecret)
      );
      if (!verification.valid) {
        const status = verification.reason === 'CLIENT_REVOKED' ? 403 : 401;
        return sendDeveloperError(
          req,
          res,
          status,
          verification.reason,
          'Invalid or revoked S2S service credentials.'
        );
      }
      resolvedClient = {
        ...verification.client,
        authMethod: 's2s_client_secret'
      };
    } else {
      return sendDeveloperError(
        req,
        res,
        401,
        'AUTHENTICATION_REQUIRED',
        'Missing S2S credentials. Provide an OAuth2 Bearer token or X-Developer-Client-Id and X-Developer-Client-Secret headers.'
      );
    }

    // Optional IP Allowlist check
    if (Array.isArray(resolvedClient.allowedIps) && resolvedClient.allowedIps.length > 0) {
      const reqIp = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
      if (!resolvedClient.allowedIps.includes(reqIp)) {
        return sendDeveloperError(
          req,
          res,
          403,
          'IP_NOT_ALLOWED',
          `Source IP ${reqIp || 'unknown'} is not authorized for this S2S client.`
        );
      }
    }

    req.developerClient = resolvedClient;
    next();
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'AUTH_INTERNAL_ERROR', 'Authentication error.');
  }
}

/**
 * Middleware factory: Enforce required permission scopes on the S2S client
 */
function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (!req.developerClient) {
      return sendDeveloperError(req, res, 401, 'AUTHENTICATION_REQUIRED', 'Unauthenticated S2S client.');
    }

    req.requiredScopesChecked = requiredScopes;
    const clientScopes = req.developerClient.scopes || [];
    if (clientScopes.includes('*')) {
      return next();
    }

    const missing = requiredScopes.filter((scope) => !clientScopes.includes(scope));
    if (missing.length > 0) {
      return sendDeveloperError(
        req,
        res,
        403,
        'INSUFFICIENT_SCOPE',
        `Client is missing required scope(s): ${missing.join(', ')}`,
        { requiredScopes, grantedScopes: clientScopes }
      );
    }

    next();
  };
}

/**
 * Middleware: Require and validate target workspace (Organization) access and tenant isolation
 */
async function requireWorkspaceAccess(req, res, next) {
  try {
    const rawOrgId =
      req.headers['x-organization-id'] ||
      req.params.organizationId ||
      req.query.organizationId;

    if (!rawOrgId) {
      return sendDeveloperError(
        req,
        res,
        400,
        'ORGANIZATION_REQUIRED',
        'Target workspace must be specified via X-Organization-Id header.'
      );
    }

    const orgIdStr = String(rawOrgId).trim();
    if (!mongoose.Types.ObjectId.isValid(orgIdStr)) {
      return sendDeveloperError(
        req,
        res,
        400,
        'INVALID_ORGANIZATION_ID',
        'Provided X-Organization-Id is not a valid ObjectId.'
      );
    }

    // Check if the S2S client is restricted to specific organizations
    const allowedOrgs = (req.developerClient?.allowedOrganizations || []).map((id) => String(id));
    if (allowedOrgs.length > 0 && !allowedOrgs.includes(orgIdStr)) {
      return sendDeveloperError(
        req,
        res,
        403,
        'WORKSPACE_ACCESS_DENIED',
        'This S2S client is not authorized to access the requested organization workspace.'
      );
    }

    const org = await Organization.findOne({ _id: orgIdStr, isActive: true }).lean();
    if (!org) {
      return sendDeveloperError(
        req,
        res,
        404,
        'WORKSPACE_NOT_FOUND',
        'Target organization workspace does not exist or is inactive.'
      );
    }

    req.organization = org;
    next();
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WORKSPACE_RESOLUTION_ERROR', 'Failed to verify workspace access.');
  }
}

/**
 * Revoke a token JTI immediately in memory and in DB if applicable
 */
async function revokeTokenJti(clientId, jti) {
  if (!jti) return false;
  revokedJtiSet.add(String(jti));
  const canQueryDb =
    mongoose.connection?.readyState === 1 ||
    Boolean(DeveloperServiceClient.findOneAndUpdate && DeveloperServiceClient.findOneAndUpdate._isMockFunction);
  if (clientId && canQueryDb && typeof DeveloperServiceClient.findOneAndUpdate === 'function') {
    await DeveloperServiceClient.findOneAndUpdate(
      { clientId },
      { $addToSet: { revokedTokenJtis: String(jti) } }
    ).catch(() => {});
  }
  return true;
}

/**
 * Rotate client secret with a grace window for the previous secret
 */
async function rotateClientSecret(clientId, newSecret, gracePeriodSeconds = 3600) {
  const envClient = getEnvManagementClient();
  const expiresAt = new Date(Date.now() + gracePeriodSeconds * 1000);

  if (envClient && clientId === envClient.clientId) {
    runtimeSecretRotationState.previousSecret = envClient.secret;
    runtimeSecretRotationState.currentSecret = newSecret;
    runtimeSecretRotationState.previousSecretExpiresAt = expiresAt;
    runtimeSecretRotationState.rotatedAt = new Date();
    return {
      clientId,
      rotatedAt: runtimeSecretRotationState.rotatedAt,
      previousSecretExpiresAt: expiresAt
    };
  }

  const dbClient = await DeveloperServiceClient.findOne({ clientId }).select('+secretHash');
  if (!dbClient) return null;

  dbClient.previousSecretHash = dbClient.secretHash;
  dbClient.secretHash = DeveloperServiceClient.hashSecret(newSecret);
  dbClient.previousSecretExpiresAt = expiresAt;
  dbClient.secretRotatedAt = new Date();
  await dbClient.save();

  return {
    clientId: dbClient.clientId,
    rotatedAt: dbClient.secretRotatedAt,
    previousSecretExpiresAt: expiresAt
  };
}

module.exports = {
  verifyClientCredentials,
  issueS2SToken,
  authenticateDeveloperService,
  requireScopes,
  requireWorkspaceAccess,
  revokeTokenJti,
  rotateClientSecret,
  revokedJtiSet,
  runtimeSecretRotationState
};
