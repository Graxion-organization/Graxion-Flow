const axios = require('axios');
const WhatsappAccount = require('../models/WhatsappAccount');
const AppError = require('../utils/AppError');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const META_API_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;

// Step 1: Exchange short-lived code for long-lived System User token
// Called after user completes Facebook Embedded Signup flow


exports.embeddedSignupCallback = async (req, res, next) => {
    try {
        const { code, redirectUri } = req.body;
        if (!code) return next(new AppError('Authorization code is required.', 400));

        const redirect_uri = redirectUri || "https://watsapp-automotion.vercel.app/callback";

        // Exchange code for access token
        const tokenRes = await axios.get(`${META_API_BASE}/oauth/access_token`, {
            params: {
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                code,
                redirect_uri
            },
        });

        const shortLivedToken = tokenRes.data.access_token;

        // Exchange short-lived for long-lived token
        const longLivedRes = await axios.get(`${META_API_BASE}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                fb_exchange_token: shortLivedToken,
            },
        });

        const longLivedToken = longLivedRes.data.access_token;

        // Step 1: Get businesses
        const bizRes = await axios.get(`${META_API_BASE}/me/businesses`, {
            params: {
                access_token: longLivedToken,
            },
        });

        const phoneNumbers = [];

        // Step 2: Loop businesses → WABA → phone numbers
        for (const biz of bizRes.data.data || []) {
            // Get WABA list
            const wabaRes = await axios.get(
                `${META_API_BASE}/${biz.id}/owned_whatsapp_business_accounts`,
                {
                    params: {
                        access_token: longLivedToken,
                    },
                }
            );

            for (const waba of wabaRes.data.data || []) {
                // Get phone numbers
                const phoneRes = await axios.get(
                    `${META_API_BASE}/${waba.id}/phone_numbers`,
                    {
                        params: {
                            access_token: longLivedToken,
                        },
                    }
                );

                for (const phone of phoneRes.data.data || []) {
                    phoneNumbers.push({
                        phoneNumberId: phone.id,
                        wabaId: waba.id,
                        wabaName: waba.name,
                        displayPhoneNumber: phone.display_phone_number,
                        verifiedName: phone.verified_name,
                    });
                }
            }
        }

        res.status(200).json({
            status: 'success',
            data: { phoneNumbers, longLivedToken },
        });

    } catch (err) {
        const metaErr = err.response?.data?.error;
        logger.error('Embedded signup token exchange error:', metaErr || err.message);
        const msg = metaErr?.message || 'Failed to complete WhatsApp signup. Please try again.';
        next(new AppError(msg, 502));
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
                organization: req.organization._id,  // ← CRITICAL: was missing before
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
