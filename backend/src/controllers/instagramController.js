const InstagramAccount = require('../models/InstagramAccount');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const axios = require('axios');

exports.connectAccount = async (req, res, next) => {
  try {
    const { igAccountId, pageId, pageAccessToken, igUsername } = req.body;
    const apiVersion = process.env.META_API_VERSION || 'v19.0';

    if (!igAccountId || !pageId || !pageAccessToken) {
      return next(new AppError('igAccountId, pageId, and pageAccessToken are required', 400));
    }

    // Verify token by making a dummy request to Graph API
    try {
      await axios.get(`https://graph.facebook.com/${apiVersion}/${igAccountId}`, {
        params: { access_token: pageAccessToken }
      });
    } catch (err) {
      return next(new AppError('Invalid Access Token or Instagram Account ID', 400));
    }

    const account = await InstagramAccount.findOneAndUpdate(
      { igAccountId },
      {
        user: req.user._id,
        organization: req.organization._id,
        igUsername,
        pageId,
        pageAccessToken,
        status: 'connected',
        isActive: true,
      },
      { new: true, upsert: true }
    );

    // Automatically subscribe the page to the app's webhooks
    try {
      await axios.post(`https://graph.facebook.com/${apiVersion}/${pageId}/subscribed_apps`, null, {
        params: {
          subscribed_fields: 'messages,messaging_postbacks,comments',
          access_token: pageAccessToken
        }
      });
      logger.info(`Successfully subscribed page ${pageId} to webhooks.`);
    } catch (err) {
      logger.warn(`Failed to auto-subscribe page ${pageId} to webhooks. You may need to do it manually in the Meta App Dashboard.`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Instagram account connected successfully and page subscribed to webhooks.',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

exports.autoConnect = async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return next(new AppError('Facebook access token is required', 400));

    const apiVersion = process.env.META_API_VERSION || 'v19.0';
    let finalUserToken = accessToken;

    // Fallback to Facebook or Meta credentials if Instagram specific ones are missing
    const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;

    // Exchange short-lived User token for long-lived User token
    // This ensures that the Page Access Tokens we fetch next are NON-EXPIRING
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
          logger.info('Successfully generated long-lived access token');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        logger.error(`Failed to get long-lived token: ${errorMsg}`);
        return next(new AppError(`Failed to generate long-lived Instagram token: ${errorMsg}. Please ensure REACT_APP_INSTAGRAM_APP_ID on frontend matches INSTAGRAM_APP_ID on backend.`, 400));
      }
    } else {
      return next(new AppError('Server is missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET environment variables.', 500));
    }
    
    // 1. Get Facebook Pages using the (now long-lived) token
    const pagesResponse = await axios.get(`https://graph.facebook.com/${apiVersion}/me/accounts`, {
      params: { access_token: finalUserToken }
    });

    const pages = pagesResponse.data.data;
    if (!pages || pages.length === 0) {
      return next(new AppError('No Facebook Pages found for this account', 404));
    }

    const connectedAccounts = [];

    // 2. For each page, check for Instagram Business Account
    for (const page of pages) {
      try {
        const pageDetails = await axios.get(`https://graph.facebook.com/${apiVersion}/${page.id}`, {
          params: { 
            fields: 'instagram_business_account,name',
            access_token: page.access_token 
          }
        });

        const igBusinessAccount = pageDetails.data.instagram_business_account;

        if (igBusinessAccount) {
          const igAccountId = igBusinessAccount.id;
          
          // 3. Get IG Username
          let igUsername = page.name || 'Instagram Account';
          try {
            const igDetails = await axios.get(`https://graph.facebook.com/${apiVersion}/${igAccountId}`, {
              params: {
                fields: 'username',
                access_token: page.access_token
              }
            });
            if (igDetails.data.username) {
              igUsername = igDetails.data.username;
            }
          } catch (err) {
            logger.warn(`Could not fetch username for IG Account ${igAccountId}`);
          }

          // Save to DB
          const account = await InstagramAccount.findOneAndUpdate(
            { igAccountId },
            {
              user: req.user._id,
              organization: req.organization._id,
              igUsername,
              pageId: page.id,
              pageAccessToken: page.access_token,
              status: 'connected',
              isActive: true,
            },
            { new: true, upsert: true }
          );
          
          connectedAccounts.push(account);

          // Automatically subscribe the page to the app's webhooks
          try {
            await axios.post(`https://graph.facebook.com/${apiVersion}/${page.id}/subscribed_apps`, null, {
              params: {
                subscribed_fields: 'messages,messaging_postbacks,feed',
                access_token: page.access_token
              }
            });
            logger.info(`Successfully subscribed page ${page.id} to webhooks.`);
          } catch (err) {
            logger.warn(`Failed to auto-subscribe page ${page.id} to webhooks. Error: ${err.response?.data?.error?.message || err.message}`);
          }
        }
      } catch (err) {
        logger.error(`Error processing page ${page.id}: ${err.message}`);
      }
    }

    if (connectedAccounts.length === 0) {
      return next(new AppError('No connected Instagram Professional Accounts found on your Facebook Pages. Please link your Instagram account to a Facebook page first.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully connected ${connectedAccounts.length} Instagram account(s).`,
      data: { accounts: connectedAccounts },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await InstagramAccount.find({ organization: req.organization._id }).sort('-createdAt');
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
    const account = await InstagramAccount.findOneAndDelete({
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
    const { commentBotEnabled, commentBotPrompt } = req.body;
    const account = await InstagramAccount.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { commentBotEnabled, commentBotPrompt },
      { new: true, runValidators: true }
    );

    if (!account) return next(new AppError('Account not found', 404));

    // Force refresh Meta Webhook subscription to ensure 'comments' field is active
    if (commentBotEnabled) {
      try {
        const apiVersion = process.env.META_API_VERSION || 'v19.0';
        await axios.post(`https://graph.facebook.com/${apiVersion}/${account.pageId}/subscribed_apps`, null, {
          params: {
            subscribed_fields: 'messages,messaging_postbacks,feed',
            access_token: account.pageAccessToken
          }
        });
        logger.info(`Force-refreshed webhook subscription for page ${account.pageId}`);
      } catch (err) {
        logger.warn(`Failed to refresh Meta subscription: ${err.response?.data?.error?.message || err.message}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Bot settings updated successfully',
      data: { account },
    });
  } catch (err) {
    next(err);
  }
};

// --- User-Facing Instagram Manual Tools ---

exports.getUserInstagramAccounts = async (req, res, next) => {
  try {
    const accounts = await InstagramAccount.find({ 
      organization: req.organization._id, 
      isActive: true 
    }).select('+pageAccessToken');
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (err) {
    next(err);
  }
};

exports.getUserInstagramMedia = async (req, res, next) => {
  try {
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findOne({
      _id: req.params.accountId,
      organization: req.organization._id
    }).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const media = await igService.getMedia();
    res.status(200).json({ status: 'success', data: { media } });
  } catch (err) {
    next(err);
  }
};

exports.getUserInstagramComments = async (req, res, next) => {
  try {
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findOne({
      _id: req.params.accountId,
      organization: req.organization._id
    }).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const comments = await igService.getMediaComments(req.params.mediaId);
    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

exports.getUserInstagramStats = async (req, res, next) => {
  try {
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findOne({
      _id: req.params.accountId,
      organization: req.organization._id
    }).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});

    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const mediaList = await igService.getMedia();
    let totalPosts = mediaList.length;
    let totalComments = 0;
    let pendingComments = 0;
    const recentMedia = mediaList.slice(0, 20);

    for (const media of recentMedia) {
      try {
        const comments = await igService.getMediaComments(media.id);
        totalComments += comments.length;
        const unanswered = comments.filter(c => 
          c.username !== account.igUsername && (!c.replies || !c.replies.data || c.replies.data.length === 0)
        );
        pendingComments += unanswered.length;
      } catch (e) {
        logger.error('Error fetching comments for media in stats:', e.message);
      }
    }

    res.status(200).json({ 
      status: 'success', 
      data: { postsAnalyzed: recentMedia.length, totalComments, pendingComments } 
    });
  } catch (err) {
    next(err);
  }
};

exports.sendUserInstagramComment = async (req, res, next) => {
  try {
    const { accountId, targetId, text, type } = req.body;
    const InstagramService = require('../services/instagramService');
    const account = await InstagramAccount.findOne({
      _id: accountId,
      organization: req.organization._id
    }).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});
    
    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    let result;
    if (type === 'media') {
      result = await igService.postComment(targetId, text);
    } else {
      result = await igService.replyToComment(account.igAccountId, targetId, text);
    }
    res.status(200).json({ status: 'success', data: { result } });
  } catch (err) {
    next(err);
  }
};

exports.triggerUserInstagramWorker = async (req, res, next) => {
  try {
    const { processUnansweredDMs } = require('../jobs/instagramWorker');
    processUnansweredDMs(); // Optional: can be refactored to only run for specific user's accounts
    res.status(200).json({ status: 'success', message: 'Instagram worker triggered successfully' });
  } catch (err) {
    next(err);
  }
};

exports.aiUserAutoReplyPost = async (req, res, next) => {
  try {
    const { accountId, mediaId } = req.body;
    const InstagramService = require('../services/instagramService');
    const AIService = require('../services/aiService');
    const User = require('../models/User');
    const { getIo } = require('../utils/socket');
    
    const account = await InstagramAccount.findOne({
      _id: accountId,
      organization: req.organization._id
    }).select('+pageAccessToken');
    if (!account) return res.status(404).json({status:'fail', message:'Account not found'});

    const user = await User.findById(account.user);
    if (!user || user.subscription.credits <= 0) return res.status(400).json({status:'fail', message:'Insufficient credits'});

    const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
    const comments = await igService.getMediaComments(mediaId);

    const pendingComments = comments.filter(c => 
      c.username !== account.igUsername && (!c.replies || !c.replies.data || c.replies.data.length === 0)
    );

    const total = pendingComments.length;
    let processed = 0;

    try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'started' }); } catch(e){}

    (async () => {
      for (const comment of pendingComments) {
        try {
          const agentMock = {
            systemPrompt: account.commentBotPrompt || "You are a helpful assistant.",
            aiProvider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 500
          };

          const aiResponse = await AIService.generate(agentMock, [], comment.text, 'instagram');
          if (aiResponse && aiResponse.content) {
            await new Promise(r => setTimeout(r, 1500));
            await igService.replyToComment(account.igAccountId, comment.id, aiResponse.content);
            await User.findByIdAndUpdate(account.user, { $inc: { 'subscription.credits': -1, 'usage.totalMessages': 1 } });
          }
        } catch(e) {
          logger.error('AI Auto Reply Comment Error:', e.message);
        }
        processed++;
        try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'processing' }); } catch(e){}
      }
      try { getIo().emit('ig_auto_reply_progress', { mediaId, processed, total, status: 'completed' }); } catch(e){}
    })();

    res.status(200).json({ status: 'success', message: 'AI Auto-Reply started in background for this post', totalPending: total });
  } catch (err) {
    next(err);
  }
};
