const AppError = require('../utils/AppError');
const InstagramAccount = require('../models/InstagramAccount');
const WhatsappAccount = require('../models/WhatsappAccount');
const TelegramAccount = require('../models/TelegramAccount');
const FacebookAccount = require('../models/FacebookAccount');
const LinkedInAccount = require('../models/LinkedInAccount');
const LinkedInService = require('../services/linkedinService');
const SocialMediaHubService = require('../services/socialMediaHubService');
const SocialPostOrchestratorService = require('../services/socialPostOrchestratorService');
const SocialPostJob = require('../models/SocialPostJob');
const CloudinaryService = require('../services/cloudinaryService');
const GeminiImageService = require('../services/geminiImageService');
const AICaptionService = require('../services/aiCaptionService');
const logger = require('../utils/logger');
const creditHelper = require('../utils/creditHelper');
const normalizePostType = (type = 'post') => {
  const value = String(type || 'post').trim().toLowerCase();
  if (value === 'carosul') return 'carousel';
  if (['post', 'reel', 'story', 'carousel'].includes(value)) return value;
  return 'post';
};

// ─── Get Connected Accounts ────────────────────────────────────────────────
exports.getConnectedAccounts = async (req, res, next) => {
  try {
    const orgId = req.organization?._id || req.user?.currentOrganization || req.user?.organization;
    const userId = req.user._id;

    const igAccounts = await InstagramAccount.find({ organization: orgId }).select("+accessToken");
    const fbAccounts = await FacebookAccount.find({ organization: orgId }).select("+accessToken");
    const waAccounts = await WhatsappAccount.find({
      $or: [{ organization: orgId }, { user: userId }],
      status: { $ne: 'disconnected' },
      isActive: true
    }).select("+accessToken");
    const tgAccounts = await TelegramAccount.find({ organization: orgId }).select("+accessToken");

    const accounts = [];
    const connectedFbPageIds = new Set();

    igAccounts.forEach(acc => {
      const accId = acc._id.toString();
      accounts.push({
        id: accId,
        platform: 'instagram',
        name: acc.igUsername || acc.pageName || 'Instagram Account',
        type: 'Business Account',
        status: acc.status,
        modelId: acc._id,
        tokenValidity: acc.status === 'error' ? 'expired' : 'valid',
        reconnectPath: '/instagram',
        errorMessage: acc.errorMessage || '',
      });

      accounts.push({
        id: `fb_${accId}`,
        platform: 'facebook',
        name: acc.pageName || 'Facebook Page',
        type: 'Business Page',
        status: acc.status,
        modelId: acc._id,
        tokenValidity: acc.status === 'error' ? 'expired' : 'valid',
        reconnectPath: '/instagram',
        errorMessage: acc.errorMessage || '',
      });
      connectedFbPageIds.add(acc.pageId);
    });

    fbAccounts.forEach(acc => {
      if (!connectedFbPageIds.has(acc.pageId)) {
        const accId = acc._id.toString();
        accounts.push({
          id: `fb_native_${accId}`,
          platform: 'facebook',
          name: acc.pageName || 'Facebook Page',
          type: 'Business Page',
          status: acc.status,
          modelId: acc._id,
          tokenValidity: acc.status === 'error' ? 'expired' : 'valid',
          reconnectPath: '/facebook',
          errorMessage: acc.errorMessage || '',
        });
      }
    });

    waAccounts.forEach(acc => {
      accounts.push({
        id: acc._id,
        platform: 'whatsapp',
        name: acc.verifiedName || acc.displayPhoneNumber || 'WhatsApp Account',
        type: 'Business API',
        status: acc.status,
        modelId: acc._id,
        tokenValidity: acc.status === 'error' ? 'expired' : 'valid',
        reconnectPath: '/whatsapp',
        errorMessage: acc.errorMessage || '',
      });
    });

    tgAccounts.forEach(acc => {
      accounts.push({
        id: acc._id,
        platform: 'telegram',
        name: acc.botName || acc.botUsername || 'Telegram Bot',
        type: 'Bot API',
        status: acc.status,
        modelId: acc._id,
        tokenValidity: acc.status === 'error' ? 'expired' : 'valid',
        reconnectPath: '/telegram',
        defaultChatId: acc.defaultChatId || '',
        errorMessage: acc.errorMessage || '',
      });
    });

    const YoutubeAccount = require('../models/YoutubeAccount');
    const youtubeAccount = await YoutubeAccount.findOne({ organization: req.organization._id, isActive: true });
    if (youtubeAccount) {
      accounts.push({
        id: 'youtube_main',
        platform: 'youtube',
        name: youtubeAccount.channelName || 'YouTube Channel',
        type: 'YouTube Channel',
        status: youtubeAccount.status,
        modelId: youtubeAccount._id,
        tokenValidity: youtubeAccount.status === 'error' ? 'expired' : 'valid',
        reconnectPath: '/social-publishing?tab=accounts',
        errorMessage: '',
      });
    }

    // LinkedIn
    const LinkedInAccount = require('../models/LinkedInAccount');
    const liAccounts = await LinkedInAccount.find({ organization: req.organization._id, isActive: true });
    liAccounts.forEach(acc => {
      accounts.push({
        id: acc._id,
        platform: 'linkedin',
        name: acc.name || 'LinkedIn User',
        type: 'Personal Profile',
        status: acc.isActive ? 'connected' : 'disconnected',
        modelId: acc._id,
        tokenValidity: 'valid',
        reconnectPath: '/social-publishing?tab=accounts',
        errorMessage: '',
      });
    });

    res.status(200).json({
      status: 'success',
      data: accounts
    });
  } catch (err) {
    next(err);
  }
};

// Helper to ensure mediaUrls are always valid HTTP URLs (e.g. if a base64 string gets through)
const ensurePublicMediaUrls = async (urls) => {
  if (!urls || !Array.isArray(urls)) return [];
  const processed = [];
  for (const url of urls) {
    if (url && (url.startsWith('data:image') || url.startsWith('data:video'))) {
      const uploaded = await CloudinaryService.upload(url, { folder: 'social_hub/processed_data_urls' });
      processed.push(uploaded.url);
    } else {
      processed.push(url);
    }
  }
  return processed;
};

// ─── Publish Content ──────────────────────────────────────────────────────
exports.publishContent = async (req, res, next) => {
  try {
    let { type, caption, mediaUrls, platforms, hashtags = [], ctaText = '', link = '', mode = 'instant', scheduledAt, platformOptions = {} } = req.body;
    type = normalizePostType(type);

    logger.info(`Publishing request: Type=${type}, Caption=${caption?.substring(0, 20)}..., MediaCount=${mediaUrls?.length}, PlatformCount=${platforms?.length}`);
    if (mediaUrls) {
      mediaUrls.forEach((url, i) => logger.info(`Media URL [${i}]: ${url?.substring(0, 50)}${url?.length > 50 ? '...' : ''}`));
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return next(new AppError('Please select at least one platform', 400));
    }

    const platformConfigs = await SocialPostOrchestratorService.buildPlatformConfigs(req.user._id, platforms, req.organization._id);
    if (!platformConfigs.length) {
      return next(new AppError('No valid connected accounts found for selected platforms. Please reconnect and try again.', 400));
    }

    const requestedPlatformRefs = new Set(platforms.map((p) => `${p.platform}:${String(p.id)}`));
    const resolvedPlatformRefs = new Set(platformConfigs.map((p) => `${p.platform}:${String(p.id)}`));
    const unresolved = [...requestedPlatformRefs].filter((ref) => !resolvedPlatformRefs.has(ref));
    if (unresolved.length) {
      return next(new AppError(`Some selected accounts are no longer available: ${unresolved.join(', ')}`, 400));
    }

    // Ensure all mediaUrls are public HTTP urls
    const publicMediaUrls = (await ensurePublicMediaUrls(mediaUrls)).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

    const masterContent = {
      text: caption || '',
      mediaUrls: publicMediaUrls || [],
      hashtags,
      ctaText,
      link,
      type,
      platformOptions,
    };
    const compatibility = await SocialPostOrchestratorService.validateCompatibility({
      ...masterContent,
      platforms: platformConfigs,
    });

    if (!compatibility.compatible) {
      return res.status(400).json({
        status: 'fail',
        message: 'Some platforms require fixes before publishing.',
        data: compatibility,
      });
    }

    const isScheduled = mode === 'scheduled';
    const scheduleDate = isScheduled ? new Date(scheduledAt) : null;
    if (isScheduled && (!scheduleDate || Number.isNaN(scheduleDate.getTime()))) {
      return next(new AppError('Valid schedule date/time is required.', 400));
    }
    if (isScheduled && scheduleDate <= new Date()) {
      return next(new AppError('Scheduled date/time must be in the future.', 400));
    }

    const Plan = require('../models/Plan');
    const userPlan = await Plan.findOne({ code: req.user.subscription?.plan || 'free' });
    const creditCostPerPost = userPlan ? userPlan.postCreditCost : 1;
    const requiredCredits = platformConfigs.length * creditCostPerPost;

    const User = require('../models/User');
    const dbUser = await User.findById(req.user._id);
    if (!dbUser) return next(new AppError('User not found', 404));

    if ((dbUser.subscription?.credits ?? 0) < requiredCredits) {
      return next(new AppError(`Insufficient credits. You need ${requiredCredits} credits but only have ${dbUser.subscription?.credits ?? 0}. Please upgrade your plan or purchase more credits.`, 400));
    }

    // Check custom posting credit spend limit
    const postingLimit = dbUser.subscription?.postingCreditLimit || 0;
    const postingUsed = dbUser.usage?.postingCreditsUsedThisMonth || 0;
    if (postingLimit > 0 && postingUsed + requiredCredits > postingLimit) {
      return next(new AppError(`Spend Limit Reached: This operation would exceed your custom Monthly Posting Credit Spend Limit of ${postingLimit} credits (Already used: ${postingUsed}, Required: ${requiredCredits}). You can adjust this limit in your Account Settings.`, 400));
    }

    const job = await SocialPostOrchestratorService.createJob({
      userId: req.user._id,
      organizationId: req.organization._id,
      masterContent,
      mode: isScheduled ? 'scheduled' : 'instant',
      scheduledAt: scheduleDate,
      platforms: platformConfigs,
    });

    // Deduct credits safely and increment spend tracking
    const newCredits = await creditHelper.deductCredits(req.user._id, requiredCredits, 'posting');
    req.user.subscription.credits = newCredits;

    // Log transaction
    await creditHelper.logTransaction({
      userId: req.user._id,
      type: 'deduction',
      amount: requiredCredits,
      description: `Automation Hub: Published content to ${platformConfigs.length} platform(s) (${platformConfigs.map((p) => p.platform).join(', ')})`,
      metadata: { jobId: job._id },
    });

    if (!isScheduled) {
      await SocialPostOrchestratorService.runJob(job);
    }

    const latest = await SocialPostJob.findById(job._id);
    
    if (latest.overallStatus === 'failed') {
      return res.status(400).json({
        status: 'fail',
        message: 'Publishing failed on all platforms.',
        data: latest,
      });
    }

    res.status(200).json({
      status: latest.overallStatus === 'partially_failed' ? 'partially_failed' : 'success',
      message: isScheduled ? 'Post scheduled successfully' : 
               latest.overallStatus === 'partially_failed' ? 'Post published with some errors.' : 'Publishing process completed',
      data: latest,
    });
  } catch (err) {
    next(err);
  }
};

exports.validatePost = async (req, res, next) => {
  try {
    let { caption = '', mediaUrls = [], hashtags = [], ctaText = '', link = '', type = 'post', platforms = [] } = req.body;
    type = normalizePostType(type);

    const publicMediaUrls = (await ensurePublicMediaUrls(mediaUrls)).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

    const platformConfigs = await SocialPostOrchestratorService.buildPlatformConfigs(req.user._id, platforms, req.organization._id);
    if (!platformConfigs.length) {
      return next(new AppError('No valid connected accounts found for selected platforms. Please reconnect and try again.', 400));
    }

    const requestedPlatformRefs = new Set(platforms.map((p) => `${p.platform}:${String(p.id)}`));
    const resolvedPlatformRefs = new Set(platformConfigs.map((p) => `${p.platform}:${String(p.id)}`));
    const unresolved = [...requestedPlatformRefs].filter((ref) => !resolvedPlatformRefs.has(ref));
    if (unresolved.length) {
      return next(new AppError(`Some selected accounts are no longer available: ${unresolved.join(', ')}`, 400));
    }
    const data = await SocialPostOrchestratorService.validateCompatibility({
      text: caption,
      mediaUrls: publicMediaUrls,
      hashtags,
      ctaText,
      link,
      type,
      platforms: platformConfigs,
    });
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
};

exports.formatPreview = async (req, res, next) => {
  try {
    const { caption = '', hashtags = [], ctaText = '', link = '', platforms = [] } = req.body;
    const previews = platforms.map((p) => ({
      platform: p.platform,
      content: SocialPostOrchestratorService.formatForPlatform({
        platform: p.platform,
        text: caption,
        hashtags,
        ctaText,
        link,
      }),
    }));
    res.status(200).json({ status: 'success', data: previews });
  } catch (err) {
    next(err);
  }
};

exports.getPublishingHistory = async (req, res, next) => {
  try {
    const history = await SocialPostJob.find({ organization: req.organization._id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ status: 'success', data: history });
  } catch (err) {
    next(err);
  }
};

exports.retryFailedPlatform = async (req, res, next) => {
  try {
    const { jobId, platform } = req.body;
    if (!jobId || !platform) return next(new AppError('jobId and platform are required', 400));
    const updated = await SocialPostOrchestratorService.retryFailedPlatform({
      jobId,
      userId: req.user._id,
      platform,
    });

    const exec = updated.executions.find(e => e.platform === platform);
    if (exec && exec.status === 'failed') {
      return res.status(400).json({
        status: 'fail',
        message: `Retry failed for ${platform}: ${exec.humanMessage || exec.errorMessage}`,
        data: updated,
      });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
};

exports.getPublishingAnalytics = async (req, res, next) => {
  try {
    const metrics = await SocialPostOrchestratorService.analytics(req.user._id, req.organization._id);
    res.status(200).json({ status: 'success', data: metrics });
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, description, platforms } = req.body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return next(new AppError('Please select at least one platform', 400));
    }

    const platformConfigs = [];
    for (const p of platforms) {
      if (p.platform === 'facebook' && typeof p.id === 'string' && p.id.startsWith('fb_native_')) {
        const targetModelId = p.id.replace('fb_native_', '');
        const FacebookAccount = require('../models/FacebookAccount');
        const acc = await FacebookAccount.findOne({ _id: targetModelId, organization: req.organization._id })
          .select('+pageAccessToken +pageId');
        if (acc) {
          platformConfigs.push({
            id: p.id,
            platform: 'facebook',
            name: p.name,
            accessToken: acc.pageAccessToken,
            pageId: acc.pageId,
          });
        }
        continue;
      }

      const targetModelId = p.platform === 'facebook' && typeof p.id === 'string' && p.id.startsWith('fb_')
        ? p.id.replace('fb_', '')
        : p.id;

      if (p.platform === 'instagram' || p.platform === 'facebook') {
        const acc = await InstagramAccount.findOne({ _id: targetModelId, organization: req.organization._id })
          .select('+pageAccessToken +pageId +igAccountId');

        if (acc) {
          platformConfigs.push({
            id: p.id,
            platform: p.platform,
            name: p.name,
            accessToken: acc.pageAccessToken,
            pageId: acc.pageId,
            igAccountId: acc.igAccountId
          });
        }
      } else {
        platformConfigs.push({ ...p });
      }
    }

    const results = await SocialMediaHubService.updateProfiles({
      name,
      description,
      platforms: platformConfigs
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile update process completed',
      results
    });
  } catch (err) {
    next(err);
  }
};

// ─── Upload Media ─────────────────────────────────────────────────────────
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new AppError('No files were uploaded', 400));
    }

    const file = req.files.file;
    logger.info(`Uploading file to Cloudinary: ${file.name} (${file.size} bytes)`);

    const result = await CloudinaryService.upload(file.tempFilePath, {
      resource_type: 'auto',
      folder: 'social_hub'
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Feed ─────────────────────────────────────────────────────────────
exports.getFeed = async (req, res, next) => {
  try {
    const igAccounts = await InstagramAccount.find({ organization: req.organization._id })
      .select('+pageAccessToken +pageId +igAccountId');
    const fbAccounts = require('../models/FacebookAccount').find({ organization: req.organization._id })
      .select('+pageAccessToken +pageId');

    const [ig, fbNative] = await Promise.all([igAccounts, fbAccounts]);
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('+youtube.accessToken +youtube.refreshToken');

    const platformConfigs = [];
    const connectedFbPageIds = new Set();

    ig.forEach(acc => {
      if (acc.status === 'connected') {
        platformConfigs.push({
          id: acc._id,
          platform: 'instagram',
          accessToken: acc.pageAccessToken,
          pageId: acc.pageId,
          igAccountId: acc.igAccountId
        });

        platformConfigs.push({
          id: `fb_${acc._id}`,
          platform: 'facebook',
          accessToken: acc.pageAccessToken,
          pageId: acc.pageId
        });
        connectedFbPageIds.add(acc.pageId);
      }
    });

    fbNative.forEach(acc => {
      if (acc.status === 'connected' && !connectedFbPageIds.has(acc.pageId)) {
        platformConfigs.push({
          id: `fb_native_${acc._id}`,
          platform: 'facebook',
          accessToken: acc.pageAccessToken,
          pageId: acc.pageId
        });
      }
    });

    const YoutubeAccount = require('../models/YoutubeAccount');
    const youtubeAccount = await YoutubeAccount.findOne({ organization: req.organization._id, isActive: true }).select('+accessToken +refreshToken');

    if (youtubeAccount) {
      platformConfigs.push({
        id: 'youtube_main',
        platform: 'youtube',
        accessToken: youtubeAccount.accessToken,
        refreshToken: youtubeAccount.refreshToken,
        expiry: youtubeAccount.tokenExpiry,
        channelId: youtubeAccount.channelId
      });
    }

    const feed = await SocialMediaHubService.getFeed(platformConfigs);

    // Fetch jobs from database
    const jobs = await SocialPostJob.find({
      organization: req.organization._id,
    }).sort({ createdAt: -1 }).limit(200);

    const mappedJobs = jobs.map(job => ({
      id: job._id,
      jobId: job._id,
      caption: job.masterContent.text,
      mediaUrl: job.masterContent.mediaUrls?.[0],
      platform: job.selectedPlatforms?.[0] || 'multiple',
      platforms: job.selectedPlatforms || [],
      executions: job.executions, // Pass executions to frontend for granular status
      timestamp: job.scheduledAt || job.createdAt,
      mode: job.mode,
      overallStatus: job.overallStatus,
      isJob: true,
      type: job.masterContent.type || 'post'
    }));

    res.status(200).json({
      status: 'success',
      data: [...mappedJobs, ...feed]
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Post ──────────────────────────────────────────────────────────
exports.deletePost = async (req, res, next) => {
  try {
    const { platform, postId, accountId, isJob, jobId } = req.body;

    if (isJob || jobId) {
      const deleted = await SocialPostJob.findOneAndDelete({ _id: jobId || postId, organization: req.organization._id
    }).select("+accessToken");
      if (!deleted) return next(new AppError('Job not found', 404));
      return res.status(200).json({ status: 'success', message: 'Scheduled post deleted' });
    }

    if (!platform || !postId || !accountId) {
      return next(new AppError('platform, postId, and accountId are required', 400));
    }

    if (platform === 'facebook' && typeof accountId === 'string' && accountId.startsWith('fb_native_')) {
      const targetModelId = accountId.replace('fb_native_', '');
      const FacebookAccount = require('../models/FacebookAccount');
      const acc = await FacebookAccount.findOne({ _id: targetModelId, organization: req.organization._id })
        .select('+pageAccessToken +pageId');
      if (!acc) return next(new AppError('Account not found', 404));
      await SocialMediaHubService.deletePost({
        platform,
        postId,
        accessToken: acc.pageAccessToken,
        pageId: acc.pageId
      });
      return res.status(200).json({ status: 'success' });
    }

    if (platform === 'youtube') {
      const YoutubeAccount = require('../models/YoutubeAccount');
      const youtubeAccount = await YoutubeAccount.findOne({ organization: req.organization._id, isActive: true }).select('+accessToken');
      if (!youtubeAccount) return next(new AppError('YouTube account not found', 404));
      
      await SocialMediaHubService.deletePost({
        platform: 'youtube',
        postId,
        accessToken: youtubeAccount.accessToken
      });
      return res.status(200).json({ status: 'success' });
    }

    const targetModelId = platform === 'facebook' && typeof accountId === 'string' && accountId.startsWith('fb_')
      ? accountId.replace('fb_', '')
      : accountId;

    const acc = await InstagramAccount.findOne({ _id: targetModelId, organization: req.organization._id })
      .select('+pageAccessToken +pageId +igAccountId');

    if (!acc) return next(new AppError('Account not found', 404));

    await SocialMediaHubService.deletePost({
      platform,
      postId,
      accessToken: acc.pageAccessToken,
      pageId: acc.pageId,
      igAccountId: acc.igAccountId
    });

    res.status(200).json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Generate image using Gemini and return a hosted URL compatible with publish flow
exports.generateImage = async (req, res, next) => {
  try {
    const { prompt, style, aspectRatio } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return next(new AppError('Prompt is required', 400));
    }

    const generated = await GeminiImageService.generateImage({
      prompt: prompt.trim(),
      style,
      aspectRatio,
    });

    // Persist the generated image so it can be reused exactly like uploaded files.
    const uploaded = await CloudinaryService.upload(generated.dataUrl, {
      resource_type: 'image',
      folder: 'social_hub/ai_generated',
      format: 'png',
    });

    res.status(200).json({
      status: 'success',
      data: {
        prompt: prompt.trim(),
        style,
        aspectRatio,
        resourceType: 'image',
        url: uploaded.url,
        publicId: uploaded.publicId,
        base64: generated.base64Data,
        mimeType: generated.mimeType,
      },
    });
  } catch (err) {
    next(err);
  }
};
exports.updateScheduledJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { caption, mediaUrls, mode, scheduledAt, platforms, platformOptions = {} } = req.body;

    const job = await SocialPostJob.findOne({ _id: jobId, organization: req.organization._id
    }).select("+accessToken");
    if (!job) return next(new AppError('Scheduled post not found', 404));

    if (job.overallStatus !== 'queued') {
      return next(new AppError('Only queued posts can be edited', 400));
    }

    if (caption) job.masterContent.text = caption;
    if (mediaUrls) job.masterContent.mediaUrls = mediaUrls;
    if (mode) job.mode = mode;
    if (scheduledAt) job.scheduledAt = scheduledAt;
    if (platforms) {
      job.selectedPlatforms = platforms.map(p => p.platform);
      job.executions = platforms.map(p => ({
        platform: p.platform,
        accountId: String(p.id),
        accountName: p.name,
        status: 'pending',
        formattedContent: SocialPostOrchestratorService.formatForPlatform({
          platform: p.platform,
          text: caption || job.masterContent.text,
          mediaUrls: mediaUrls || job.masterContent.mediaUrls
        })
      }));
    }

    if (platformOptions) {
      job.masterContent.platformOptions = platformOptions;
    }

    await job.save();
    res.status(200).json({ status: 'success', data: job });
  } catch (err) {
    next(err);
  }
};

// ─── Get Post Insights ─────────────────────────────────────────────────────────
exports.getInsights = async (req, res, next) => {
  try {
    const { platform, postId, accountId } = req.query;
    
    if (!platform || !postId || !accountId) {
      return res.status(400).json({ status: 'fail', message: 'Platform, postId, and accountId are required' });
    }

    let accessToken;
    let pageId;
    let igAccountId;

    const InstagramAccount = require('../models/InstagramAccount');
    const FacebookAccount = require('../models/FacebookAccount');

    if (platform === 'facebook') {
      let acc;
      if (accountId.startsWith('fb_native_')) {
        acc = await FacebookAccount.findById(accountId.replace('fb_native_', '')).select('+pageAccessToken +pageId');
      } else if (accountId.startsWith('fb_')) {
        acc = await InstagramAccount.findById(accountId.replace('fb_', '')).select('+pageAccessToken +pageId');
      } else {
        acc = await FacebookAccount.findById(accountId).select('+pageAccessToken +pageId');
        if (!acc) acc = await InstagramAccount.findById(accountId).select('+pageAccessToken +pageId');
      }
      
      if (!acc || !acc.pageAccessToken) throw new Error('Account or Access Token not found');
      accessToken = acc.pageAccessToken;
      pageId = acc.pageId;
      
      const fbService = new (require('../services/facebookService'))(accessToken, pageId);
      const data = await fbService.getInsights(postId);
      return res.status(200).json({ status: 'success', data });
      
    } else if (platform === 'instagram') {
      const acc = await InstagramAccount.findById(accountId).select('+pageAccessToken +pageId +igAccountId');
      if (!acc || !acc.pageAccessToken) throw new Error('Account or Access Token not found');
      accessToken = acc.pageAccessToken;
      pageId = acc.pageId;
      igAccountId = acc.igAccountId;
      
      const igService = new (require('../services/instagramService'))(accessToken, pageId, igAccountId);
      const data = await igService.getInsights(postId);
      return res.status(200).json({ status: 'success', data });
    } else {
      return res.status(400).json({ status: 'fail', message: 'Unsupported platform for insights' });
    }
  } catch (err) {
    next(err);
  }
};

// ─── LinkedIn OAuth ────────────────────────────────────────────────────────
exports.getLinkedInAuthUrl = (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const scope = ['openid', 'profile', 'w_member_social', 'r_member_social'].join(' ');

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  res.status(200).json({ status: 'success', url });
};

exports.linkedinCallback = async (req, res, next) => {
  const axios = require('axios');
  try {
    const { code } = req.body;
    if (!code) return next(new AppError('Code is required', 400));

    // Exchange code for token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI
      }
    });

    const accessToken = tokenResponse.data.access_token;
    const expiresAt = new Date(Date.now() + tokenResponse.data.expires_in * 1000);

    // Get LinkedIn Profile
    const profile = await LinkedInService.getProfile(accessToken);

    const account = await LinkedInAccount.findOneAndUpdate(
      { linkedinId: profile.id, organization: req.organization._id },
      {
        user: req.user._id,
        organization: req.organization._id,
        linkedinId: profile.id,
        name: profile.name,
        profilePicture: profile.profilePicture,
        accessToken: accessToken,
        expiresAt: expiresAt,
        isActive: true
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'LinkedIn account connected successfully',
      data: account
    });
  } catch (err) {
    logger.error('LinkedIn OAuth callback error:', err);
    next(new AppError('Failed to connect LinkedIn account: ' + (err.response?.data?.error_description || err.message), 500));
  }
};

exports.disconnectLinkedInAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await LinkedInAccount.findOneAndDelete({ _id: id, organization: req.organization._id
    }).select("+accessToken");
    if (!deleted) return next(new AppError('LinkedIn account not found', 404));
    res.status(200).json({ status: 'success', message: 'LinkedIn account disconnected successfully' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// MANUAL AUTOMATION HUB ENDPOINTS (LINKEDIN)
// ==========================================

exports.getAllLinkedInAccounts = async (req, res, next) => {
  try {
    const accounts = await LinkedInAccount.find({ organization: req.organization._id
    }).select("+accessToken");
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (err) {
    next(err);
  }
};

exports.getLinkedInMedia = async (req, res, next) => {
  try {
    const account = await LinkedInAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+accessToken");
    if (!account) return next(new AppError('LinkedIn account not found', 404));

    const liService = new LinkedInService(account.accessToken, account.linkedinId);
    const posts = await liService.getMemberPosts(50);

    res.status(200).json({ status: 'success', data: { media: posts } });
  } catch (err) {
    next(err);
  }
};

exports.getLinkedInMediaComments = async (req, res, next) => {
  try {
    const account = await LinkedInAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+accessToken");
    if (!account) return next(new AppError('LinkedIn account not found', 404));

    const liService = new LinkedInService(account.accessToken, account.linkedinId);
    const comments = await liService.getPostComments(req.params.mediaId);

    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

exports.replyToLinkedInComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return next(new AppError('Reply text is required', 400));

    const account = await LinkedInAccount.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select("+accessToken");
    if (!account) return next(new AppError('LinkedIn account not found', 404));

    const liService = new LinkedInService(account.accessToken, account.linkedinId);
    const result = await liService.replyToComment(req.params.commentId, text);

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};


// --- AI Caption Generation ---
exports.generateAICaption = async (req, res, next) => {
  try {
    const { platform = 'instagram', genre = 'product', tone = 'casual', context = '', brandName = '', targetAudience = '' } = req.body;
    const result = await AICaptionService.generateCaption({ platform, genre, tone, context, brandName, targetAudience });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};

// --- Today's Publishing Analytics ---
exports.getTodayAnalytics = async (req, res, next) => {
  try {
    const orgId = req.organization._id;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const todayJobs = await SocialPostJob.find({ organization: orgId, createdAt: { $gte: todayStart, $lte: todayEnd } }).sort({ createdAt: -1 });
    const recentJobs = await SocialPostJob.find({ organization: orgId, createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } }).select('executions overallStatus createdAt selectedPlatforms');
    const PLATFORMS = ['instagram','facebook','linkedin','youtube','telegram'];
    const platformRows = {};
    PLATFORMS.forEach(p => { platformRows[p] = { platform: p, posts: [], total: 0, success: 0, failed: 0, scheduled: 0, processing: 0 }; });
    todayJobs.forEach(job => {
      (job.executions || []).forEach(exec => {
        const p = exec.platform;
        if (!platformRows[p]) platformRows[p] = { platform: p, posts: [], total: 0, success: 0, failed: 0, scheduled: 0, processing: 0 };
        platformRows[p].total++;
        if (exec.status === 'success') platformRows[p].success++;
        else if (exec.status === 'failed') platformRows[p].failed++;
        else if (job.overallStatus === 'queued') platformRows[p].scheduled++;
        else platformRows[p].processing++;
        platformRows[p].posts.push({ jobId: job._id, caption: (job.masterContent?.text || '').substring(0,80), type: job.masterContent?.type || 'post', status: exec.status, overallStatus: job.overallStatus, publishedAt: exec.publishedAt, scheduledAt: job.scheduledAt, createdAt: job.createdAt, mediaUrl: job.masterContent?.mediaUrls?.[0] || null, externalPostId: exec.externalPostId || null, errorMessage: exec.humanMessage || exec.errorMessage || null, mode: job.mode });
      });
    });
    const totalExecutions = todayJobs.reduce((a,j)=>a+(j.executions||[]).length,0);
    const successEx = todayJobs.reduce((a,j)=>a+(j.executions||[]).filter(e=>e.status==='success').length,0);
    const failedEx = todayJobs.reduce((a,j)=>a+(j.executions||[]).filter(e=>e.status==='failed').length,0);
    const bestTimes = {};
    PLATFORMS.forEach(p => { bestTimes[p] = AICaptionService.getBestTimeToPost(recentJobs, p); });
    res.status(200).json({ status: 'success', data: { summary: { totalJobs: todayJobs.length, totalExecutions, successExecutions: successEx, failedExecutions: failedEx, scheduledJobs: todayJobs.filter(j=>j.overallStatus==='queued').length, successRate: totalExecutions > 0 ? Math.round((successEx/totalExecutions)*100) : 0 }, platforms: Object.values(platformRows).filter(p=>p.total>0), allPlatforms: Object.values(platformRows), bestTimes, date: new Date().toISOString() } });
  } catch (err) { next(err); }
};

// --- Best Time to Post ---
exports.getBestTimeToPost = async (req, res, next) => {
  try {
    const { platform = 'instagram' } = req.query;
    const recentJobs = await SocialPostJob.find({ organization: req.organization._id, createdAt: { $gte: new Date(Date.now()-30*24*60*60*1000) } }).select('executions overallStatus');
    const result = AICaptionService.getBestTimeToPost(recentJobs, platform);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};
exports.getLinkedInStats = async (req, res, next) => {
  try {
    res.status(200).json({ status: 'success', data: { views: 0, comments: 0 } });
  } catch (err) {
    next(err);
  }
};

exports.triggerLinkedInWorker = async (req, res, next) => {
  try {
    const LinkedinAutomationService = require('../services/linkedinAutomationService');
    LinkedinAutomationService.runAutomation().catch(err => logger.error('LinkedIn Worker Error: ' + err.message));
    res.status(200).json({ status: 'success', message: 'Worker triggered successfully' });
  } catch (err) {
    next(err);
  }
};

exports.autoReplyLinkedInPost = async (req, res, next) => {
  try {
    const { accountId, mediaId } = req.body;
    if (!accountId || !mediaId) return next(new AppError('accountId and mediaId required', 400));
    
    const account = await LinkedInAccount.findOne({ _id: accountId, organization: req.organization._id }).select('+accessToken');
    if (!account) return next(new AppError('Account not found', 404));

    const Agent = require('../models/Agent');
    const agent = await Agent.findOne({ linkedinAccount: accountId, platforms: 'linkedin', organization: req.organization._id });
    if (!agent) return next(new AppError('Please setup an AI Agent for this LinkedIn account first', 400));

    const liService = new LinkedInService(account.accessToken, account.linkedinId);
    const commentsResponse = await liService.getPostComments(mediaId);
    const comments = commentsResponse.elements || [];
    
    const AIService = require('../services/aiService');
    
    const processAutoReply = async () => {
      let count = 0;
      if (!agent.repliedLinkedinComments) agent.repliedLinkedinComments = [];
      
      for (const comment of comments) {
         const commentId = comment.id;
         const commentText = comment.message?.text;
         const authorUrn = comment.actor;

         if (agent.repliedLinkedinComments.includes(commentId)) continue;
         if (authorUrn.includes(account.linkedinId)) continue;
         if (!commentText) continue;

         try {
           const aiResponse = await AIService.generate(
             agent,
             [],
             `Comment: ${commentText}`,
             'linkedin'
           );
           
           const replyText = aiResponse.content;
           
           if (replyText && !replyText.includes('experiencing some technical difficulties')) {
             await liService.replyToComment(commentId, replyText);
             agent.repliedLinkedinComments.push(commentId);
             count++;
           }
         } catch(e) {
           logger.error(`Error auto-replying to LinkedIn comment ${commentId}: ${e.message}`);
         }
      }
      if (count > 0) {
        await agent.save();
      }
    };
    
    processAutoReply().catch(err => logger.error('LinkedIn AutoReply Error: ' + err.message));

    res.status(200).json({ status: 'success', message: 'Auto reply process started' });
  } catch (err) {
    next(err);
  }
};
