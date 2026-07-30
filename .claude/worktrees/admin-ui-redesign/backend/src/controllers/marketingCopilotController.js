const MarketingCampaign = require('../models/MarketingCampaign');
const MarketingCopilotService = require('../services/marketingCopilotService');
const SocialPostOrchestratorService = require('../services/socialPostOrchestratorService');
const SocialPostJob = require('../models/SocialPostJob');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const creditHelper = require('../utils/creditHelper');

/**
 * Fetch connected social accounts matched to campaign requirements
 */
const getTargetPlatformsForCampaign = async (organizationId, selectedPlatforms) => {
  const targets = [];
  
  try {
    // 1. Instagram & Facebook (connected via Instagram)
    const InstagramAccount = require('../models/InstagramAccount');
    const igAccounts = await InstagramAccount.find({ organization: organizationId });
    igAccounts.forEach(acc => {
      if (acc.status === 'connected') {
        if (selectedPlatforms.includes('instagram')) {
          targets.push({ platform: 'instagram', id: acc._id.toString(), name: acc.igUsername || 'Instagram' });
        }
        if (selectedPlatforms.includes('facebook')) {
          targets.push({ platform: 'facebook', id: `fb_${acc._id.toString()}`, name: acc.pageName || 'Facebook' });
        }
      }
    });

    // 2. Facebook (native pages)
    const FacebookAccount = require('../models/FacebookAccount');
    const fbAccounts = await FacebookAccount.find({ organization: organizationId });
    fbAccounts.forEach(acc => {
      if (acc.status === 'connected') {
        const alreadyAdded = targets.some(t => t.platform === 'facebook' && t.id.includes(acc._id.toString()));
        if (selectedPlatforms.includes('facebook') && !alreadyAdded) {
          targets.push({ platform: 'facebook', id: `fb_native_${acc._id.toString()}`, name: acc.pageName || 'Facebook' });
        }
      }
    });

    // 3. LinkedIn
    const LinkedInAccount = require('../models/LinkedInAccount');
    const liAccounts = await LinkedInAccount.find({ organization: organizationId, isActive: true });
    liAccounts.forEach(acc => {
      if (selectedPlatforms.includes('linkedin')) {
        targets.push({ platform: 'linkedin', id: acc._id.toString(), name: acc.name || 'LinkedIn' });
      }
    });

    // 4. YouTube
    const YoutubeAccount = require('../models/YoutubeAccount');
    const ytAccounts = await YoutubeAccount.find({ organization: organizationId });
    ytAccounts.forEach(acc => {
      if (acc.status === 'connected' && selectedPlatforms.includes('youtube')) {
        targets.push({ platform: 'youtube', id: 'youtube_main', name: acc.channelName || 'YouTube' });
      }
    });

    // 5. Telegram
    const TelegramAccount = require('../models/TelegramAccount');
    const tgAccounts = await TelegramAccount.find({ organization: organizationId });
    tgAccounts.forEach(acc => {
      if (acc.status === 'connected' && selectedPlatforms.includes('telegram')) {
        targets.push({ platform: 'telegram', id: acc._id.toString(), name: acc.botName || 'Telegram' });
      }
    });
  } catch (err) {
    logger.error('[MarketingCopilot] Error loading targets:', err.message);
  }

  return targets;
};

// ─── Get Active Campaign ──────────────────────────────────────────────────
exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    res.status(200).json({
      status: 'success',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Save Business Details ───────────────────────────────────────────────
exports.saveDetails = async (req, res, next) => {
  try {
    const { name, timings, businessModel, category, description, products, targetAudience, tone, platforms, contactDetails } = req.body;

    if (!name) {
      return next(new AppError('Business name is required', 400));
    }

    let campaign = await MarketingCampaign.findOne({ organization: req.organization._id });

    if (!campaign) {
      campaign = new MarketingCampaign({
        organization: req.organization._id,
        user: req.user._id,
        businessDetails: { name, timings, businessModel, category, description, products, targetAudience, tone, platforms, contactDetails },
        status: 'draft'
      });
    } else {
      campaign.businessDetails = { name, timings, businessModel, category, description, products, targetAudience, tone, platforms, contactDetails };
    }

    await campaign.save();
    res.status(200).json({
      status: 'success',
      message: 'Business profile saved',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Generate Viral Strategy ──────────────────────────────────────────────
exports.generateStrategy = async (req, res, next) => {
  try {
    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.businessDetails?.name) {
      return next(new AppError('Please save business details first', 400));
    }

    const strategy = await MarketingCopilotService.generateStrategy(campaign.businessDetails);
    campaign.strategy = strategy;
    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: 'Viral marketing strategy generated successfully',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Generate 1-Month Calendar ───────────────────────────────────────────
exports.generateCalendar = async (req, res, next) => {
  try {
    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.strategy?.overallHook) {
      return next(new AppError('Please generate strategy first', 400));
    }

    const calendarPosts = await MarketingCopilotService.generateCalendar(campaign.businessDetails, campaign.strategy);
    
    // Assign scheduled times spread out daily/weekly
    const updatedCalendar = calendarPosts.map((post) => {
      let videoScriptStr = '';
      if (post.videoScript) {
        if (typeof post.videoScript === 'object') {
          videoScriptStr = `Visual: ${post.videoScript.visual || ''}\nSpoken: ${post.videoScript.spoken || ''}`;
        } else {
          videoScriptStr = String(post.videoScript);
        }
      }

      let imagePromptStr = '';
      if (post.imagePrompt) {
        if (typeof post.imagePrompt === 'object') {
          imagePromptStr = `Subject: ${post.imagePrompt.subject || ''}\nStyle: ${post.imagePrompt.style || ''}\nColors: ${post.imagePrompt.colors || ''}`;
        } else {
          imagePromptStr = String(post.imagePrompt);
        }
      }

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + post.day);
      scheduledAt.setHours(10, 0, 0, 0); // Default optimal post time is 10:00 AM

      return {
        ...post,
        videoScript: videoScriptStr,
        imagePrompt: imagePromptStr,
        scheduledAt,
        status: 'draft'
      };
    });

    campaign.calendar = updatedCalendar;
    campaign.status = 'draft';
    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: '1-Month content calendar generated',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Generate Post Assets ─────────────────────────────────────────────────
exports.generatePostAssets = async (req, res, next) => {
  try {
    const { day, useStockVideo } = req.body;
    if (day === undefined) {
      return next(new AppError('Day parameter is required', 400));
    }

    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.calendar || campaign.calendar.length === 0) {
      return next(new AppError('Content calendar not found', 404));
    }

    const postIndex = campaign.calendar.findIndex(p => p.day === Number(day));
    if (postIndex === -1) {
      return next(new AppError(`Post for Day ${day} not found in calendar`, 404));
    }

    const post = campaign.calendar[postIndex];
    post.status = 'generating';
    await campaign.save();

    // Deduct AI credits for generation
    const requiredCredits = post.type === 'reel' || post.type === 'video' ? 3 : 1;
    const User = require('../models/User');
    const dbUser = await User.findById(req.user._id);

    if ((dbUser?.subscription?.credits ?? 0) < requiredCredits) {
      post.status = 'draft';
      post.error = 'Insufficient credits';
      await campaign.save();
      return next(new AppError(`Insufficient credits. You need ${requiredCredits} credits for asset generation.`, 400));
    }

    try {
      const result = await MarketingCopilotService.generateAssets(post, useStockVideo);
      
      // Update calendar item
      post.mediaUrl = result.url;
      post.mediaType = result.mediaType;
      post.status = 'ready';
      post.error = null;
      await campaign.save();

      // Deduct credits and log it
      const newCredits = await creditHelper.deductCredits(req.user._id, requiredCredits, 'ai_generation');
      req.user.subscription.credits = newCredits;

      await creditHelper.logTransaction({
        userId: req.user._id,
        type: 'deduction',
        amount: requiredCredits,
        description: `Marketing Copilot: Generated assets for Day ${day} (${post.type})`,
      });

      res.status(200).json({
        status: 'success',
        message: 'Assets generated successfully',
        data: campaign
      });
    } catch (assetErr) {
      post.status = 'draft';
      post.error = assetErr.message;
      await campaign.save();
      throw assetErr;
    }
  } catch (err) {
    next(err);
  }
};

// ─── Schedule Single Post ─────────────────────────────────────────────────
exports.schedulePost = async (req, res, next) => {
  try {
    const { day, scheduledAt } = req.body;
    if (day === undefined) {
      return next(new AppError('Day parameter is required', 400));
    }

    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.calendar || campaign.calendar.length === 0) {
      return next(new AppError('Campaign calendar not found', 404));
    }

    const post = campaign.calendar.find(p => p.day === Number(day));
    if (!post) {
      return next(new AppError(`Post for Day ${day} not found`, 404));
    }

    if (!post.mediaUrl) {
      return next(new AppError('Cannot schedule a post without generated media. Please generate assets first.', 400));
    }

    // Connect to actual social media platforms connected to this organization
    const targets = await getTargetPlatformsForCampaign(req.organization._id, post.platforms);
    if (targets.length === 0) {
      return next(new AppError('No connected accounts found for this post\'s platforms. Please link accounts in Social Hub first.', 400));
    }

    // Build platform configs for orchestrator
    const platformConfigs = await SocialPostOrchestratorService.buildPlatformConfigs(req.user._id, targets, req.organization._id);
    if (platformConfigs.length === 0) {
      return next(new AppError('Connected accounts are invalid or expired.', 400));
    }

    // Verify credits for posting (e.g. 1 credit per platform)
    const User = require('../models/User');
    const dbUser = await User.findById(req.user._id);
    const Plan = require('../models/Plan');
    const userPlan = await Plan.findOne({ code: req.user.subscription?.plan || 'free' });
    const creditCostPerPost = userPlan ? userPlan.postCreditCost : 1;
    const requiredCredits = platformConfigs.length * creditCostPerPost;

    if ((dbUser.subscription?.credits ?? 0) < requiredCredits) {
      return next(new AppError(`Insufficient credits. You need ${requiredCredits} credits to schedule this post.`, 400));
    }

    const scheduleDate = scheduledAt ? new Date(scheduledAt) : new Date(post.scheduledAt);
    if (scheduleDate <= new Date()) {
      return next(new AppError('Scheduled date/time must be in the future.', 400));
    }

    // Create the social post job
    const job = await SocialPostOrchestratorService.createJob({
      userId: req.user._id,
      organizationId: req.organization._id,
      masterContent: {
        text: post.caption,
        mediaUrls: [post.mediaUrl],
        type: post.type || 'post'
      },
      mode: 'scheduled',
      scheduledAt: scheduleDate,
      platforms: platformConfigs
    });

    // Deduct posting credits and log transaction
    const newCredits = await creditHelper.deductCredits(req.user._id, requiredCredits, 'posting');
    req.user.subscription.credits = newCredits;

    await creditHelper.logTransaction({
      userId: req.user._id,
      type: 'deduction',
      amount: requiredCredits,
      description: `Marketing Copilot: Scheduled post for Day ${day} to ${platformConfigs.length} platform(s)`,
      metadata: { jobId: job._id }
    });

    // Update campaign post details
    post.status = 'scheduled';
    post.jobId = job._id;
    post.scheduledAt = scheduleDate;
    
    // Switch campaign status to active once posting starts
    campaign.status = 'active';
    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: `Post for Day ${day} scheduled successfully`,
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Schedule All Ready Posts ─────────────────────────────────────────────
exports.scheduleAll = async (req, res, next) => {
  try {
    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.calendar || campaign.calendar.length === 0) {
      return next(new AppError('Campaign calendar not found', 404));
    }

    const readyPosts = campaign.calendar.filter(p => p.status === 'ready');
    if (readyPosts.length === 0) {
      return next(new AppError('No posts are in "ready" state. Generate assets first.', 400));
    }

    let successCount = 0;
    let failedCount = 0;

    for (const post of readyPosts) {
      try {
        const targets = await getTargetPlatformsForCampaign(req.organization._id, post.platforms);
        if (targets.length === 0) continue;

        const platformConfigs = await SocialPostOrchestratorService.buildPlatformConfigs(req.user._id, targets, req.organization._id);
        if (platformConfigs.length === 0) continue;

        // Perform atomic check on credits for each loop run
        const User = require('../models/User');
        const dbUser = await User.findById(req.user._id);
        const Plan = require('../models/Plan');
        const userPlan = await Plan.findOne({ code: req.user.subscription?.plan || 'free' });
        const creditCostPerPost = userPlan ? userPlan.postCreditCost : 1;
        const requiredCredits = platformConfigs.length * creditCostPerPost;

        if ((dbUser.subscription?.credits ?? 0) < requiredCredits) {
          logger.warn(`[MarketingCopilot] Stop schedule-all: Insufficient credits for post Day ${post.day}`);
          break;
        }

        const scheduleDate = new Date(post.scheduledAt);
        if (scheduleDate <= new Date()) {
          // Adjust scheduled time if it's already in the past
          scheduleDate.setDate(new Date().getDate() + 1);
        }

        const job = await SocialPostOrchestratorService.createJob({
          userId: req.user._id,
          organizationId: req.organization._id,
          masterContent: {
            text: post.caption,
            mediaUrls: [post.mediaUrl],
            type: post.type || 'post'
          },
          mode: 'scheduled',
          scheduledAt: scheduleDate,
          platforms: platformConfigs
        });

        // Deduct credits and log it
        const newCredits = await creditHelper.deductCredits(req.user._id, requiredCredits, 'posting');
        req.user.subscription.credits = newCredits;

        await creditHelper.logTransaction({
          userId: req.user._id,
          type: 'deduction',
          amount: requiredCredits,
          description: `Marketing Copilot: Scheduled post for Day ${post.day} (Bulk)`,
          metadata: { jobId: job._id }
        });

        post.status = 'scheduled';
        post.jobId = job._id;
        post.scheduledAt = scheduleDate;
        successCount++;
      } catch (err) {
        logger.error(`[MarketingCopilot] Bulk schedule error on Day ${post.day}:`, err.message);
        failedCount++;
      }
    }

    if (successCount > 0) {
      campaign.status = 'active';
    }
    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: `Bulk schedule completed: ${successCount} scheduled, ${failedCount} failed`,
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Approve Manual Post (Designer Mode) ──────────────────────────────────
exports.approveManualPost = async (req, res, next) => {
  try {
    const { day, mediaUrl, mediaType } = req.body;
    if (day === undefined) {
      return next(new AppError('Day parameter is required', 400));
    }
    if (!mediaUrl) {
      return next(new AppError('Media URL is required', 400));
    }
    if (!mediaType) {
      return next(new AppError('Media type is required (image or video)', 400));
    }

    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign || !campaign.calendar || campaign.calendar.length === 0) {
      return next(new AppError('Content calendar not found', 404));
    }

    const post = campaign.calendar.find(p => p.day === Number(day));
    if (!post) {
      return next(new AppError(`Post for Day ${day} not found in calendar`, 404));
    }

    post.mediaUrl = mediaUrl;
    post.mediaType = mediaType;
    post.status = 'ready';
    post.error = null;

    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: 'Post approved successfully with designer media',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete/Reset Campaign ───────────────────────────────────────────────
exports.deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await MarketingCampaign.findOne({ organization: req.organization._id });
    if (!campaign) {
      return next(new AppError('No campaign found to delete', 404));
    }

    // Cancel any scheduled jobs in campaign calendar that are queued
    const scheduledPosts = campaign.calendar.filter(p => p.status === 'scheduled' && p.jobId);
    for (const post of scheduledPosts) {
      try {
        await SocialPostJob.findOneAndDelete({ _id: post.jobId, organization: req.organization._id });
      } catch (e) {
        logger.warn(`[MarketingCopilot] Failed to delete job ${post.jobId}:`, e.message);
      }
    }

    await MarketingCampaign.findOneAndDelete({ organization: req.organization._id });

    res.status(200).json({
      status: 'success',
      message: 'Marketing Campaign reset and deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
