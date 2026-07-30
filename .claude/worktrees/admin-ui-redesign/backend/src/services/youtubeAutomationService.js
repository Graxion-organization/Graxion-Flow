const YoutubeAutomation = require('../models/YoutubeAutomation');
const User = require('../models/User');
const YoutubeAccount = require('../models/YoutubeAccount');
const YoutubeProvider = require('./youtubeProvider');
const AIService = require('./aiService');
const logger = require('../utils/logger');

class YoutubeAutomationService {
  /**
   * Main job to process YouTube comments for all active automations
   */
  static async runAutomation() {
    try {
      logger.info('[YouTube Automation] Starting comment check cycle...');
      
      const automations = await YoutubeAutomation.find({ enabled: true });
      
      for (const automation of automations) {
        try {
          await this.processUserAutomation(automation);
        } catch (err) {
          logger.error(`[YouTube Automation] Error processing user ${automation.user?.email}:`, err.message);
          
          // Handle specific OAuth errors by disconnecting if necessary
          if (err.response?.data?.error === 'invalid_grant' || err.message === 'TOKEN_EXPIRED') {
             logger.warn(`[YouTube Automation] Critical OAuth error for ${automation.user?.email}. Disconnecting YouTube.`);
             await User.findByIdAndUpdate(automation.user._id, { 'youtube.connected': false });
          }
        }
      }
      
      logger.info('[YouTube Automation] Cycle completed.');
    } catch (err) {
      logger.error('[YouTube Automation] Fatal error in cycle:', err.message);
    }
  }

  /**
   * Process automation for a single user
   */
  static async processUserAutomation(automation) {
    const youtubeAccount = await YoutubeAccount.findOne({ organization: automation.organization, isActive: true }).select('+accessToken +refreshToken');
    if (!youtubeAccount) return;

    // Initialize provider
    const provider = new YoutubeProvider(
      youtubeAccount.accessToken,
      youtubeAccount.refreshToken,
      youtubeAccount.tokenExpiry,
      youtubeAccount.channelId
    );

    // Refresh token if needed
    if (youtubeAccount.tokenExpiry && new Date(youtubeAccount.tokenExpiry) <= new Date()) {
      logger.info(`[YouTube Automation] Refreshing token for channel ${youtubeAccount.channelName}`);
      await provider.refreshYouTubeTokenForAccount(youtubeAccount);
    }

    // Fetch latest comments with retry on 401
    let threads;
    try {
      threads = await provider.fetchLatestComments(20);
    } catch (err) {
      if (err.message === 'TOKEN_EXPIRED') {
        logger.info(`[YouTube Automation] Token expired for channel ${youtubeAccount.channelName}, refreshing and retrying...`);
        const refreshed = await provider.refreshYouTubeTokenForAccount(youtubeAccount);
        provider.accessToken = refreshed.accessToken;
        threads = await provider.fetchLatestComments(20);
        logger.info(`[YouTube Automation] Successfully retried with refreshed token`);
      } else {
        throw err;
      }
    }

    if (!threads || threads.length === 0) return;

    // Fetch video titles for these threads
    const videoIds = [...new Set(threads.map(t => t.snippet.videoId))];
    const videoDetails = await provider.fetchVideosDetails(videoIds);
    const videoTitleMap = videoDetails.reduce((acc, v) => {
      acc[v.id] = v.snippet.title;
      return acc;
    }, {});

    for (const thread of threads) {
      const topComment = thread.snippet.topLevelComment;
      const commentId = topComment.id;
      const commentText = topComment.snippet.textOriginal;
      const authorName = topComment.snippet.authorDisplayName;
      const videoId = thread.snippet.videoId;
      const videoTitle = videoTitleMap[videoId] || 'YouTube Video';

      // Skip if already replied or processed
      if (automation.repliedCommentIds.includes(commentId)) continue;
      if (automation.pendingComments.some(c => c.commentId === commentId)) continue;

      // Skip if author is the channel itself
      if (topComment.snippet.authorChannelId?.value === youtubeAccount.channelId) continue;

      logger.info(`[YouTube Automation] New comment from ${authorName}: ${commentText.substring(0, 30)}...`);

      // Generate AI Reply
      const aiResponse = await AIService.generate(
        { _id: 'youtube_auto', systemPrompt: automation.aiPrompt, model: 'gemini-1.5-flash', temperature: 0.7 },
        [], // no context messages
        `Comment from ${authorName}: ${commentText}`,
        'youtube'
      );
      const replyText = aiResponse.content;

      if (!replyText || replyText.includes("experiencing some technical difficulties")) {
         logger.warn(`[YouTube Automation] AI failed to generate reply for comment: ${commentId}`);
         continue;
      }

      if (automation.automationMode === 'auto') {
        // Auto-reply
        const success = await provider.replyToCommentThread(commentId, replyText);
        if (success) {
          automation.repliedCommentIds.push(commentId);
          automation.replyHistory.push({
            commentId,
            videoId: thread.snippet.videoId,
            videoTitle: videoTitle,
            authorName,
            authorThumbnail: topComment.snippet.authorProfileImageUrl,
            userComment: commentText,
            aiReply: replyText,
            repliedAt: new Date()
          });
          logger.info(`[YouTube Automation] Auto-replied and saved to history: ${commentId}`);
        }
      } else {
        // Manual mode - Save to pending
        automation.pendingComments.push({
          commentId,
          authorName,
          authorThumbnail: topComment.snippet.authorProfileImageUrl,
          text: commentText,
          videoId: thread.snippet.videoId,
          videoTitle: videoTitle, // API doesn't return title in commentThreads.list, would need another call
          publishedAt: topComment.snippet.publishedAt,
          aiSuggestedReply: replyText,
          status: 'pending'
        });
        logger.info(`[YouTube Automation] Saved comment to pending for manual approval: ${commentId}`);
      }
    }

    automation.lastCheckedAt = new Date();
    await automation.save();
  }

  /**
   * Manual approval of a pending comment
   */
  static async approveReply(userId, organizationId, commentId, customReply = null) {
    const automation = await YoutubeAutomation.findOne({ organization: organizationId });
    if (!automation) throw new Error('Automation settings not found');

    const youtubeAccount = await YoutubeAccount.findOne({ organization: organizationId, isActive: true }).select('+accessToken +refreshToken');
    if (!youtubeAccount) throw new Error('YouTube account not connected');

    const pending = automation.pendingComments.find(c => c.commentId === commentId);
    if (!pending) throw new Error('Comment not found in pending list');

    const user = automation.user;
    const provider = new YoutubeProvider(
      youtubeAccount.accessToken,
      youtubeAccount.refreshToken,
      youtubeAccount.tokenExpiry,
      youtubeAccount.channelId
    );

    // Refresh token if needed
    if (new Date(youtubeAccount.tokenExpiry) <= new Date()) {
      await provider.refreshYouTubeTokenForAccount(youtubeAccount);
    }

    const replyText = customReply || pending.aiSuggestedReply;
    let success;
    try {
      success = await provider.replyToCommentThread(commentId, replyText);
    } catch (err) {
      if (err.message === 'TOKEN_EXPIRED') {
        logger.info(`[YouTube Automation] Token expired during manual approval for channel ${youtubeAccount.channelName}, refreshing and retrying...`);
        const refreshed = await provider.refreshYouTubeTokenForAccount(youtubeAccount);
        provider.accessToken = refreshed.accessToken;
        success = await provider.replyToCommentThread(commentId, replyText);
      } else {
        throw err;
      }
    }

    if (success) {
      automation.repliedCommentIds.push(commentId);
      pending.status = 'replied';

      // Save to history
      automation.replyHistory.push({
        commentId,
        videoId: pending.videoId,
        videoTitle: pending.videoTitle || 'YouTube Video',
        authorName: pending.authorName,
        authorThumbnail: pending.authorThumbnail,
        userComment: pending.text,
        aiReply: replyText,
        repliedAt: new Date()
      });

      // Keep in list or remove? Let's keep and mark as replied for history, but maybe limit list size.
      if (automation.pendingComments.length > 100) automation.pendingComments.shift();
      if (automation.replyHistory.length > 200) automation.replyHistory.shift(); // Limit history size
      
      await automation.save();
      return true;
    }
    return false;
  }
}

module.exports = YoutubeAutomationService;
