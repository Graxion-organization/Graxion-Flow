const axios = require('axios');
const WhatsappAccount = require('../models/WhatsappAccount');
const AppError = require('../utils/AppError');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const META_API_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

// Step 1: Exchange short-lived code for long-lived System User token & auto-connect WABAs / phone numbers
exports.embeddedSignupCallback = async (req, res, next) => {
    try {
        const { code, redirectUri, appId: frontendAppId } = req.body;
        if (!code) return next(new AppError('Authorization code is required.', 400));

        const appId = (process.env.META_APP_ID || '').trim().replace(/^["']|["']$/g, '');
        const appSecret = (process.env.META_APP_SECRET || '').trim().replace(/^["']|["']$/g, '');

        if (!appId || !appSecret) {
          return next(new AppError('META_APP_ID or META_APP_SECRET is missing in backend environment variables on Render.', 500));
        }

        // Diagnostic Check: Verify Frontend App ID matches Backend App ID
        if (frontendAppId && frontendAppId !== appId) {
          logger.error(`Meta App ID Mismatch: Frontend sending "${frontendAppId}", Backend has "${appId}"`);
          return next(new AppError(`App ID Mismatch! Vercel is sending App ID (${frontendAppId}), but Render has META_APP_ID (${appId}). Please set REACT_APP_META_APP_ID on Vercel and META_APP_ID on Render to the exact same Meta App ID.`, 400));
        }

        // Exchange code for access token
        const tokenRes = await axios.get(`${META_API_BASE}/oauth/access_token`, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                code,
            },
        });

        const shortLivedToken = tokenRes.data.access_token;

        // Exchange short-lived for long-lived token
        let longLivedToken = shortLivedToken;
        try {
          const longLivedRes = await axios.get(`${META_API_BASE}/oauth/access_token`, {
              params: {
                  grant_type: 'fb_exchange_token',
                  client_id: appId,
                  client_secret: appSecret,
                  fb_exchange_token: shortLivedToken,
              },
          });
          if (longLivedRes.data?.access_token) {
            longLivedToken = longLivedRes.data.access_token;
          }
        } catch (llErr) {
          logger.warn('Long lived token exchange warning, using short lived token:', llErr.message);
        }

        const phoneNumbers = [];
        const seenPhoneIds = new Set();
        const wabas = [];

        // 1. Fetch via GET /me/shared_whatsapp_business_accounts (Official Meta Embedded Signup Endpoint)
        try {
          const sharedRes = await axios.get(`${META_API_BASE}/me/shared_whatsapp_business_accounts`, {
            params: { access_token: longLivedToken }
          });
          if (sharedRes.data?.data) {
            wabas.push(...sharedRes.data.data);
          }
        } catch (e1) {
          logger.warn('shared_whatsapp_business_accounts warning:', e1.response?.data?.error?.message || e1.message);
        }

        // 2. Fetch via GET /me/whatsapp_business_accounts
        try {
          const wabaRes = await axios.get(`${META_API_BASE}/me/whatsapp_business_accounts`, {
            params: { access_token: longLivedToken }
          });
          if (wabaRes.data?.data) {
            wabas.push(...wabaRes.data.data);
          }
        } catch (e2) {
          console.warn('[EmbeddedSignup] whatsapp_business_accounts warning:', e2.response?.data?.error?.message || e2.message);
        }

        // 3. Fallback via GET /me/businesses (if business_management permission granted)
        try {
          const bizRes = await axios.get(`${META_API_BASE}/me/businesses`, {
            params: { access_token: longLivedToken }
          });
          for (const biz of bizRes.data?.data || []) {
            try {
              const bizWabaRes = await axios.get(`${META_API_BASE}/${biz.id}/owned_whatsapp_business_accounts`, {
                params: { access_token: longLivedToken }
              });
              if (bizWabaRes.data?.data) {
                wabas.push(...bizWabaRes.data.data);
              }
            } catch (e) {}
          }
        } catch (e3) {
          logger.warn('businesses fetch warning:', e3.response?.data?.error?.message || e3.message);
        }

        // 4. Fetch via /debug_token to get granular_scopes target_ids
        try {
          const debugRes = await axios.get(`${META_API_BASE}/debug_token`, {
            params: {
              input_token: longLivedToken,
              access_token: `${appId}|${appSecret}`
            }
          });
          const granularScopes = debugRes.data?.data?.granular_scopes || [];
          const waScope = granularScopes.find(s => s.scope === 'whatsapp_business_management');
          if (waScope && waScope.target_ids) {
            for (const targetId of waScope.target_ids) {
              wabas.push({ id: targetId, name: 'WhatsApp Account (from token scopes)' });
            }
          }
        } catch (e4) {
          logger.warn('debug_token fetch warning:', e4.response?.data?.error?.message || e4.message);
        }

        // Deduplicate WABAs by ID
        const uniqueWabas = Array.from(new Map(wabas.map(w => [w.id, w])).values());

        // Step 2: Fetch phone numbers for each WABA
        for (const waba of uniqueWabas) {
          try {
            const phoneRes = await axios.get(`${META_API_BASE}/${waba.id}/phone_numbers`, {
              params: { access_token: longLivedToken }
            });

            for (const phone of phoneRes.data?.data || []) {
              if (!seenPhoneIds.has(phone.id)) {
                seenPhoneIds.add(phone.id);
                phoneNumbers.push({
                  phoneNumberId: phone.id,
                  wabaId: waba.id,
                  wabaName: waba.name || 'WhatsApp Account',
                  displayPhoneNumber: phone.display_phone_number || phone.phone_number || phone.id,
                  verifiedName: phone.verified_name || phone.display_phone_number || 'WhatsApp Business',
                });
              }
            }
          } catch (phoneErr) {
            console.warn(`[EmbeddedSignup] Failed to fetch phone numbers for WABA ${waba.id}:`, phoneErr.response?.data?.error?.message || phoneErr.message);
          }
        }

        console.log(`[EmbeddedSignup] Fetched ${phoneNumbers.length} phone numbers from Meta.`);

        // Auto-save connected phone numbers directly to MongoDB
        const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
        const savedAccounts = [];

        let skippedDueToOrg = 0;

        for (const phone of phoneNumbers) {
          try {
            // Prevent cross-workspace stealing
            const existing = await WhatsappAccount.findOne({ phoneNumberId: phone.phoneNumberId });
            if (existing && existing.organization?.toString() !== orgId.toString()) {
               console.warn(`[EmbeddedSignup] Skipping phone ${phone.phoneNumberId} - belongs to another organization.`);
               skippedDueToOrg++;
               continue;
            }

            // Subscribe to WABA webhook on Meta
            try {
              await axios.post(
                `${META_API_BASE}/${phone.wabaId}/subscribed_apps`,
                {},
                { params: { access_token: longLivedToken } }
              );
            } catch (subErr) {
               console.warn(`[EmbeddedSignup] Webhook sub failed:`, subErr.message);
            }

            // Register the phone number for Cloud API
            try {
              const pin = Math.floor(100000 + Math.random() * 900000).toString();
              await axios.post(
                `${META_API_BASE}/${phone.phoneNumberId}/register`,
                { messaging_product: 'whatsapp', pin: pin },
                { params: { access_token: longLivedToken } }
              );
              console.log(`[EmbeddedSignup] Phone ${phone.phoneNumberId} registered successfully with PIN ${pin}.`);
            } catch (regErr) {
               console.warn(`[EmbeddedSignup] Registration failed for ${phone.phoneNumberId}:`, regErr.response?.data?.error?.message || regErr.message);
            }

            const account = await WhatsappAccount.findOneAndUpdate(
              { phoneNumberId: phone.phoneNumberId },
              {
                user: req.user._id,
                organization: orgId,
                phoneNumberId: phone.phoneNumberId,
                wabaId: phone.wabaId,
                accessToken: encrypt(longLivedToken),
                displayPhoneNumber: phone.displayPhoneNumber,
                verifiedName: phone.verifiedName,
                status: 'connected',
                lastVerified: new Date(),
                webhookVerified: true,
                isActive: true,
                errorMessage: undefined,
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const accObj = account.toObject();
            delete accObj.accessToken;
            savedAccounts.push(accObj);
          } catch (saveErr) {
            console.warn(`[EmbeddedSignup] Auto-save error for phone ${phone.phoneNumberId}:`, saveErr.message);
          }
        }

        if (savedAccounts.length === 0) {
            if (phoneNumbers.length > 0 && skippedDueToOrg > 0) {
                return next(new AppError('The WhatsApp number you selected is already connected to another Workspace. Please disconnect it from that Workspace first, or use a different number.', 400));
            }
            return next(new AppError('No WhatsApp phone numbers found. Please make sure you explicitly select your business and phone numbers during the Meta authentication flow (even if you previously connected them).', 400));
        }

        res.status(200).json({
            status: 'success',
            message: `Connected ${savedAccounts.length} WhatsApp phone number(s)!`,
            data: { phoneNumbers, longLivedToken, accounts: savedAccounts },
        });

    } catch (err) {
        const metaErr = err.response?.data?.error;
        logger.error('Embedded signup token exchange error:', metaErr || err.message);
        const msg = metaErr?.message || err.message || 'Failed to complete WhatsApp signup. Please try again.';
        next(new AppError(msg, 400));
    }
};

// Step 2: Save selected phone number after user picks from list
exports.embeddedSignupSave = async (req, res, next) => {
    try {
        const { phoneNumberId, wabaId, accessToken, displayPhoneNumber, verifiedName } = req.body;

        if (!phoneNumberId || !wabaId || !accessToken) {
            return next(new AppError('phoneNumberId, wabaId, and accessToken are required.', 400));
        }

        // Check duplicate — same phone number should not be connected to a different org
        const existing = await WhatsappAccount.findOne({ phoneNumberId });
        if (existing && existing.organization?.toString() !== req.organization._id.toString()) {
            return next(new AppError('This number is already connected to another organization.', 400));
        }

        // Check plan limit (scoped to organization)
        const count = await WhatsappAccount.countDocuments({
            organization: req.organization._id,
            isActive: true,
            ...(existing ? { _id: { $ne: existing._id } } : {}),
        });
        const limits = await req.user.getPlanLimits();
        if (!existing && count >= limits.agents) {
            return next(new AppError(`Your plan allows only ${limits.agents} number(s). Please upgrade.`, 403));
        }

        // Subscribe to webhook for this WABA (register webhook on Meta side)
        try {
            await axios.post(
                `${META_API_BASE}/${wabaId}/subscribed_apps`,
                {},
                { params: { access_token: accessToken } }
            );
            logger.info(`Webhook subscribed for WABA: ${wabaId}`);
        } catch (subErr) {
            logger.warn('Webhook subscription warning:', subErr.response?.data?.error?.message);
        }

        const account = await WhatsappAccount.findOneAndUpdate(
            { phoneNumberId },
            {
                user: req.user._id,
                organization: req.organization._id,
                phoneNumberId,
                wabaId,
                accessToken: encrypt(accessToken),
                displayPhoneNumber,
                verifiedName,
                status: 'connected',
                lastVerified: new Date(),
                webhookVerified: true,
                isActive: true,
                errorMessage: undefined,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const accountObj = account.toObject();
        delete accountObj.accessToken;

        logger.info(`Account connected via Embedded Signup: ${displayPhoneNumber} for user ${req.user._id}`);

        res.status(201).json({
            status: 'success',
            message: `${displayPhoneNumber} connected successfully!`,
            data: { account: accountObj },
        });
    } catch (err) {
        logger.error('Embedded signup save error:', err);
        next(err);
    }
};
