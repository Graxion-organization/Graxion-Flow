const FacebookAccount = require('../models/FacebookAccount');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const axios = require('axios');

exports.autoConnect = async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return next(new AppError('Facebook access token is required', 400));

    const apiVersion = process.env.META_API_VERSION || 'v19.0';
    let finalUserToken = accessToken;

    const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;

    if (appId && appSecret) {
      try {
        const tokenExchangeRes = await axios.get(`https://graph.facebook.com/${apiVersion}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: accessToken,
          }
        });
        if (tokenExchangeRes.data && tokenExchangeRes.data.access_token) {
          finalUserToken = tokenExchangeRes.data.access_token;
        }
      } catch (err) {
        const metaErr = err.response?.data?.error?.message || err.message;
        logger.error(`Failed to get long-lived token: ${metaErr} (Status: ${err.response?.status})`);
        return next(new AppError(`Failed to generate long-lived Facebook token: ${metaErr}. Please check FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.`, 400));
      }
    } else {
      return next(new AppError('Server is missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET environment variables.', 500));
    }
    let pagesResponse;
    try {
      pagesResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me/accounts`, {
        params: { access_token: finalUserToken }
      });
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      const errCode = err.response?.data?.error?.code || 'API_ERROR';
      logger.error(`Facebook /me/accounts request failed: ${errMsg} (Code: ${errCode})`);
      return next(new AppError(`Facebook API Error: ${errMsg} (Meta Code: ${errCode})`, err.response?.status || 400));
    }

    const pages = pagesResponse.data.data;
    if (!pages || pages.length === 0) {
      return next(new AppError('No Facebook Pages found for this account', 404));
    }

    const connectedAccounts = [];

    for (const page of pages) {
      try {
        const account = await FacebookAccount.findOneAndUpdate(
          { pageId: page.id },
          {
            user: req.user._id,
            organization: req.organization._id,
            pageName: page.name || 'Facebook Page',
            pageAccessToken: page.access_token,
            status: 'connected',
            isActive: true,
            lastValidatedAt: new Date(),
          },
          { new: true, upsert: true }
        );
        
        connectedAccounts.push(account);

        try {
          await axios.post(`https://graph.facebook.com/${apiVersion}/${page.id}/subscribed_apps`, null, {
            params: {
              subscribed_fields: 'messages,messaging_postbacks,feed',
              access_token: page.access_token
            }
          });
        } catch (err) {
          logger.warn(`Failed to auto-subscribe page ${page.id}. Error: ${err.message}`);
        }
      } catch (err) {
        logger.error(`Error processing page ${page.id}: ${err.message}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully connected ${connectedAccounts.length} Facebook page(s).`,
      data: { accounts: connectedAccounts },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await FacebookAccount.find({ organization: req.organization._id }).sort('-createdAt');
    res.status(200).json({
      status: 'success',
      data: { accounts },
    });
  } catch (err) {
    next(err);
  }
};

exports.disconnectAccount = async (req, res, next) => {
  try {
    const account = await FacebookAccount.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization._id,
    });

    if (!account) return next(new AppError('Account not found', 404));

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

exports.updateBotSettings = async (req, res, next) => {
  try {
    const { messengerBotEnabled, messengerBotPrompt } = req.body;
    const account = await FacebookAccount.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { messengerBotEnabled, messengerBotPrompt },
      { new: true, runValidators: true }
    );

    if (!account) return next(new AppError('Account not found', 404));

    res.status(200).json({
      status: 'success',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// MANUAL AUTOMATION HUB ENDPOINTS
// ==========================================

const FacebookService = require('../services/facebookService');

exports.getMedia = async (req, res, next) => {
  try {
    const account = await FacebookAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+pageAccessToken");
    if (!account) return next(new AppError('Facebook account not found', 404));

    const fbService = new FacebookService(account.pageAccessToken, account.pageId);
    const posts = await fbService.getPagePosts(50);

    res.status(200).json({ status: 'success', data: { media: posts } });
  } catch (err) {
    next(err);
  }
};

exports.getMediaComments = async (req, res, next) => {
  try {
    const account = await FacebookAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+pageAccessToken");
    if (!account) return next(new AppError('Facebook account not found', 404));

    const fbService = new FacebookService(account.pageAccessToken, account.pageId);
    const comments = await fbService.getPostComments(req.params.mediaId);

    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

exports.replyToComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return next(new AppError('Reply text is required', 400));

    const account = await FacebookAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+pageAccessToken");
    if (!account) return next(new AppError('Facebook account not found', 404));

    const fbService = new FacebookService(account.pageAccessToken, account.pageId);
    const result = await fbService.replyToComment(req.params.commentId, text);

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
