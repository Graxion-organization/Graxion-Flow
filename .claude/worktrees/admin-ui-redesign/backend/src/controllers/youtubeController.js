const YoutubeProvider = require('../services/youtubeProvider');
const User = require('../models/User');
const YoutubeAccount = require('../models/YoutubeAccount');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

exports.getAuthUrl = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

  res.status(200).json({ status: 'success', url });
};

exports.callback = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return next(new AppError('Code is required', 400));

    const youtubeData = await YoutubeProvider.connectYouTube(code);

    await YoutubeAccount.findOneAndUpdate(
      { channelId: youtubeData.channelId, organization: req.organization._id },
      {
        user: req.user._id,
        organization: req.organization._id,
        channelId: youtubeData.channelId,
        channelName: youtubeData.channelName,
        accessToken: youtubeData.accessToken,
        refreshToken: youtubeData.refreshToken,
        tokenExpiry: youtubeData.tokenExpiry,
        status: 'connected',
        isActive: true
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'YouTube account connected successfully',
      data: {
        channelName: youtubeData.channelName,
        channelId: youtubeData.channelId,
      },
    });
  } catch (err) {
    logger.error('YouTube OAuth callback error:', err);
    if (err.isOperational) return next(err);
    next(new AppError('Failed to connect YouTube account', 500));
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    await YoutubeAccount.updateMany(
      { organization: req.organization._id },
      {
        $set: {
          status: 'disconnected',
          isActive: false,
        },
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'YouTube account disconnected',
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// MANUAL AUTOMATION HUB ENDPOINTS
// ==========================================

exports.getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await YoutubeAccount.find({ organization: req.organization._id
    }).select("+accessToken +refreshToken");
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (err) {
    next(err);
  }
};

exports.getMedia = async (req, res, next) => {
  try {
    const account = await YoutubeAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select("+accessToken +refreshToken");
    if (!account) return next(new AppError('YouTube account not found', 404));

    const ytProvider = new YoutubeProvider(account.accessToken, account.refreshToken, account.tokenExpiry, account.channelId);
    
    // Auto-refresh token if needed
    if (new Date(account.tokenExpiry) < new Date(Date.now() + 5 * 60000)) {
      await ytProvider.refreshYouTubeTokenForAccount(account);
    }

    const videos = await ytProvider.fetchVideos(50);
    const formattedMedia = videos.map(video => ({
      ...video,
      id: video.contentDetails?.videoId || video.snippet?.resourceId?.videoId || video.id
    }));
    res.status(200).json({ status: 'success', data: { media: formattedMedia } });
  } catch (err) {
    next(err);
  }
};

exports.getMediaComments = async (req, res, next) => {
  try {
    const account = await YoutubeAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select("+accessToken +refreshToken");
    if (!account) return next(new AppError('YouTube account not found', 404));

    const ytProvider = new YoutubeProvider(account.accessToken, account.refreshToken, account.tokenExpiry, account.channelId);
    
    if (new Date(account.tokenExpiry) < new Date(Date.now() + 5 * 60000)) {
      await ytProvider.refreshYouTubeTokenForAccount(account);
    }

    const comments = await ytProvider.fetchVideoComments(req.params.mediaId, 50);
    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

exports.replyToComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return next(new AppError('Reply text is required', 400));

    const account = await YoutubeAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select("+accessToken +refreshToken");
    if (!account) return next(new AppError('YouTube account not found', 404));

    const ytProvider = new YoutubeProvider(account.accessToken, account.refreshToken, account.tokenExpiry, account.channelId);
    
    if (new Date(account.tokenExpiry) < new Date(Date.now() + 5 * 60000)) {
      await ytProvider.refreshYouTubeTokenForAccount(account);
    }

    const result = await ytProvider.replyToCommentThread(req.params.commentId, text);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const account = await YoutubeAccount.findOne({ _id: req.params.id, organization: req.organization._id }).select("+accessToken +refreshToken");
    if (!account) return next(new AppError('YouTube account not found', 404));

    const ytProvider = new YoutubeProvider(account.accessToken, account.refreshToken, account.tokenExpiry, account.channelId);
    if (new Date(account.tokenExpiry) < new Date(Date.now() + 5 * 60000)) {
      await ytProvider.refreshYouTubeTokenForAccount(account);
    }
    
    const channelDetails = await ytProvider.fetchChannelDetails();
    const stats = channelDetails.statistics || { viewCount: 0, commentCount: 0 };
    
    res.status(200).json({ 
      status: 'success', 
      data: { 
        views: stats.viewCount, 
        comments: stats.commentCount 
      } 
    });
  } catch (err) {
    next(err);
  }
};

exports.triggerWorker = async (req, res, next) => {
  try {
    const YoutubeAutomationService = require('../services/youtubeAutomationService');
    YoutubeAutomationService.runAutomation().catch(err => logger.error('Background YouTube Worker Error: ' + err.message));
    res.status(200).json({ status: 'success', message: 'Worker triggered successfully' });
  } catch (err) {
    next(err);
  }
};

exports.autoReplyPost = async (req, res, next) => {
  try {
    const { accountId, mediaId } = req.body;
    if (!accountId || !mediaId) return next(new AppError('accountId and mediaId required', 400));
    
    const account = await YoutubeAccount.findOne({ _id: accountId, organization: req.organization._id }).select("+accessToken +refreshToken");
    if (!account) return next(new AppError('Account not found', 404));

    const YoutubeAutomation = require('../models/YoutubeAutomation');
    const automation = await YoutubeAutomation.findOne({ organization: req.organization._id });
    if (!automation) return next(new AppError('Please setup YouTube automation settings first', 400));

    const ytProvider = new YoutubeProvider(account.accessToken, account.refreshToken, account.tokenExpiry, account.channelId);
    if (new Date(account.tokenExpiry) < new Date(Date.now() + 5 * 60000)) {
      await ytProvider.refreshYouTubeTokenForAccount(account);
    }

    const comments = await ytProvider.fetchVideoComments(mediaId, 50);
    const AIService = require('../services/aiService');
    
    const processAutoReply = async () => {
      let count = 0;
      for (const comment of comments) {
         const topComment = comment.snippet.topLevelComment;
         const commentId = topComment.id;
         const commentText = topComment.snippet.textOriginal;
         const authorName = topComment.snippet.authorDisplayName;

         if (automation.repliedCommentIds.includes(commentId)) continue;
         if (topComment.snippet.authorChannelId?.value === account.channelId) continue;

         try {
           const aiResponse = await AIService.generate(
             { _id: 'youtube_auto', systemPrompt: automation.aiPrompt, model: 'gemini-1.5-flash', temperature: 0.7 },
             [],
             `Comment from ${authorName}: ${commentText}`,
             'youtube'
           );
           
           const replyText = aiResponse.content;
           
           if (replyText && !replyText.includes("experiencing some technical difficulties")) {
             const success = await ytProvider.replyToCommentThread(commentId, replyText);
             if (success) {
               automation.repliedCommentIds.push(commentId);
               count++;
             }
           }
         } catch(e) {
           logger.error(`Error auto-replying to ${commentId}: ${e.message}`);
         }
      }
      if (count > 0) {
        await automation.save();
      }
    };
    
    processAutoReply().catch(err => logger.error('AutoReply Error: ' + err.message));

    res.status(200).json({ status: 'success', message: 'Auto reply process started' });
  } catch (err) {
    next(err);
  }
};
