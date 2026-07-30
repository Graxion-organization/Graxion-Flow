const SocialPostJob = require('../models/SocialPostJob');
const InstagramAccount = require('../models/InstagramAccount');
const TelegramAccount = require('../models/TelegramAccount');
const FacebookAccount = require('../models/FacebookAccount');
const LinkedInAccount = require('../models/LinkedInAccount');
const InstagramService = require('./instagramService');
const FacebookService = require('./facebookService');
const TelegramService = require('./telegramService');
const YoutubeProvider = require('./youtubeProvider');
const LinkedInService = require('./linkedinService');
const CloudinaryService = require('./cloudinaryService');
const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { emitToUser } = require('../utils/socket');

const MAX_GBP_TEXT = 1500;

const normalizeHashtags = (hashtags = []) =>
  hashtags
    .map((h) => String(h || '').trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h}`));

const normalizeType = (rawType = 'post') => {
  const value = String(rawType || 'post').trim().toLowerCase();
  if (value === 'carosul') return 'carousel';
  if (['post', 'reel', 'story', 'carousel'].includes(value)) return value;
  return 'post';
};

const asErrorText = (err) => {
  if (!err) return '';
  if (typeof err === 'string') return err;

  const pieces = [
    err.message,
    err.response?.data?.error?.message,
    err.response?.data?.message,
  ].filter(Boolean);

  if (pieces.length > 0) return pieces.join(' | ');

  try {
    return JSON.stringify(err.response?.data || err);
  } catch (_e) {
    return 'Unknown publish error';
  }
};

const humanizeError = (rawMessage = '') => {
  const msg = String(rawMessage).toLowerCase();

  if (msg.includes('unknown error') || (msg.includes('code":1') && msg.includes('oauthexception'))) {
    return 'Meta (Facebook/Instagram) temporary issue detected. Please retry shortly.';
  }

  if (
    msg.includes('expired') ||
    msg.includes('access token') ||
    (msg.includes('oauth') && (msg.includes('token') || msg.includes('session') || msg.includes('validate')))
  ) {
    return 'Your account session expired. Please reconnect this platform.';
  }

  if (msg.includes('rate limit') || msg.includes('too many')) return 'Platform rate limit reached. Please retry in a few minutes.';
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('socket hang up') || msg.includes('temporar')) {
    return 'Temporary network issue detected. Please retry.';
  }
  if (msg.includes('unsupported') || msg.includes('format') || msg.includes('invalid image') || msg.includes('invalid video')) {
    return 'This media format is not supported for this platform.';
  }
  if (msg.includes('requires at least one valid image') || msg.includes('requires media')) {
    return 'This platform requires at least one valid media file for this post type.';
  }

  return 'Publishing failed. Please review content and try again.';
};

const classifyError = (rawMessage = '') => {
  const msg = String(rawMessage).toLowerCase();

  const isUnknownMeta = msg.includes('unknown error') || (msg.includes('code":1') && msg.includes('oauthexception'));

  // Non-retryable: Auth & Session
  const tokenError =
    !isUnknownMeta &&
    (msg.includes('access token') ||
      msg.includes('session has expired') ||
      msg.includes('token expired') ||
      (msg.includes('oauth') && (msg.includes('token') || msg.includes('session') || msg.includes('validate'))) ||
      msg.includes('reauthorize') ||
      msg.includes('reconnect'));

  // Non-retryable: Permissions & Validation
  const fatalError = 
    msg.includes('permission') || 
    msg.includes('unauthorized') || 
    msg.includes('invalid') || 
    msg.includes('unsupported') || 
    msg.includes('requires at least one') || 
    msg.includes('limit reached') || 
    msg.includes('restricted');

  // Retryable: Network, Timeout, 5xx, Transient
  const transient =
    isUnknownMeta ||
    msg.includes('timeout') ||
    msg.includes('temporar') ||
    msg.includes('network') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('media is not ready') ||
    msg.includes('not ready for publishing');

  return {
    tokenError,
    fatalError,
    transient,
  };
};

class SocialPostOrchestratorService {
  static detectContentType(type, mediaUrls = []) {
    let detectedType = 'text_only';
    const videos = [];
    const images = [];

    for (const url of mediaUrls) {
      if (!url) continue;
      const isVid = /\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$|#)/i.test(url) || url.toLowerCase().includes('/video/') || url.toLowerCase().includes('resource_type=video') || url.toLowerCase().includes('/video');
      if (isVid) videos.push(url);
      else images.push(url);
    }

    const rawType = String(type || 'post').trim().toLowerCase();
    if (rawType === 'reel') detectedType = 'reel';
    else if (rawType === 'story') {
      detectedType = videos.length > 0 ? 'story_video' : (images.length > 0 ? 'story_image' : 'text_only');
    } else if (mediaUrls.length === 1) {
      detectedType = videos.length === 1 ? 'video_single' : 'image_single';
    } else if (mediaUrls.length > 1) {
      if (videos.length > 0 && images.length > 0) detectedType = 'carousel_mixed';
      else if (videos.length > 0) detectedType = 'carousel_video';
      else detectedType = 'carousel_image';
    }
    return detectedType;
  }

  static resolveCapabilities({ content, platform, account }) {
    const { mediaUrls = [], detectedType } = content;
    const result = {
      supported: true,
      warnings: [],
      fallback: null,
      transformedType: detectedType
    };

    if (platform === 'instagram') {
      if (detectedType === 'text_only') {
        result.supported = false;
        result.warnings.push('Instagram requires at least one image or video.');
      }
      if (detectedType.startsWith('carousel_')) {
        result.transformedType = 'carousel'; // Native carousel
        if (mediaUrls.length > 10) {
          result.supported = false;
          result.warnings.push('Instagram carousels are limited to 10 media items.');
        }
      }
      if (detectedType.startsWith('story_')) {
        result.transformedType = 'story'; // Stories natively
        if (!account || !account.igAccountId) {
          result.supported = false;
          result.warnings.push('Instagram Stories are restricted to business accounts with a valid igAccountId.');
        }
      }
      if (detectedType === 'reel') {
        result.transformedType = 'reel';
        const hasVideo = mediaUrls.some(url => /\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$|#)/i.test(url) || url.toLowerCase().includes('/video/') || url.toLowerCase().includes('resource_type=video') || url.toLowerCase().includes('/video'));
        if (!hasVideo) {
          result.supported = false;
          result.warnings.push('Instagram Reel requires a valid video.');
        }
      }
    } else if (platform === 'facebook') {
      if (detectedType.startsWith('story_')) {
        result.supported = false;
        result.warnings.push('Facebook Page Story publishing is unsupported via this API.');
      }
      if (detectedType === 'carousel_image') {
        result.fallback = 'multi_photo_post';
        result.transformedType = 'post';
        if (mediaUrls.length > 10) {
          result.supported = false;
          result.warnings.push('Facebook post attachments are limited to 10 media items.');
        }
      }
      if (detectedType === 'carousel_mixed' || detectedType === 'carousel_video') {
        result.supported = false;
        result.warnings.push('Facebook Graph API does not support videos in multi-media posts.');
      }
    } else if (platform === 'telegram') {
      if (detectedType.startsWith('story_')) {
        result.supported = false;
        result.warnings.push('Telegram does not support Story format.');
      }
      if (detectedType.startsWith('carousel_')) {
        result.transformedType = 'post';
      }
    } else if (platform === 'youtube') {
      // YouTube only supports Shorts (mapped from Reels)
      if (detectedType === 'reel') {
        result.transformedType = 'short';
        const hasVideo = mediaUrls.some(url => /\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$|#)/i.test(url) || url.toLowerCase().includes('/video/') || url.toLowerCase().includes('resource_type=video') || url.toLowerCase().includes('/video'));
        if (!hasVideo) {
          result.supported = false;
          result.warnings.push('YouTube Shorts require a valid video.');
        }
      } else {
        result.supported = false;
        result.warnings.push('YouTube only supports Shorts (Reel) on this platform. Post, Carousel, and Story are disabled.');
      }
    } else if (platform === 'linkedin') {
      if (detectedType === 'reel') {
        result.transformedType = 'post';
        result.warnings.push('LinkedIn does not have Reels. This will be shared as a standard video post.');
      }
      if (detectedType.startsWith('story_')) {
        result.supported = false;
        result.warnings.push('LinkedIn Stories are no longer supported by the platform.');
      }
      if (detectedType.startsWith('carousel_')) {
        // LinkedIn carousels are actually Documents. For now, we'll fallback to a link share or first image
        result.warnings.push('LinkedIn Carousel (Multi-image) will be shared as a single link with the primary image.');
      }
    }

    return result;
  }

  static getRetryDelay(attemptCount) {
    const delays = [5000, 20000, 60000];
    return delays[attemptCount - 1] || 60000;
  }

  static async buildPlatformConfigs(userId, requestedPlatforms = [], organizationId = null) {
    const configs = [];
    logger.info(`Building platform configs for user ${userId}, org ${organizationId}. Requested: ${requestedPlatforms.length}`);

    for (const p of requestedPlatforms) {
      const pid = String(p.id || '');
      const filter = organizationId ? { _id: null, organization: organizationId } : { user: userId };
      
      if (p.platform === 'facebook' && pid.startsWith('fb_native_')) {
        const targetModelId = pid.replace('fb_native_', '');
        const query = organizationId ? { _id: targetModelId, organization: organizationId } : { _id: targetModelId, user: userId };
        const acc = await FacebookAccount.findOne(query).select('+pageAccessToken +pageId');

        if (!acc) {
          logger.warn(`Account not found: platform=${p.platform}, targetModelId=${targetModelId}, user=${userId}`);
          continue;
        }

        configs.push({
          id: pid,
          modelId: targetModelId,
          platform: 'facebook',
          name: p.name,
          accessToken: acc.pageAccessToken,
          pageId: acc.pageId,
          status: acc.status === 'error' || acc.status === 'disconnected' ? 'error' : 'connected',
          reconnectPath: '/facebook',
        });
        continue;
      }

      const targetModelId = p.platform === 'facebook' && pid.startsWith('fb_') ? pid.replace('fb_', '') : pid;

      if (p.platform === 'instagram' || p.platform === 'facebook') {
        const query = organizationId ? { _id: targetModelId, organization: organizationId } : { _id: targetModelId, user: userId };
        const acc = await InstagramAccount.findOne(query).select('+pageAccessToken +pageId +igAccountId');

        if (!acc) {
          logger.warn(`Account not found: platform=${p.platform}, targetModelId=${targetModelId}, user=${userId}`);
          continue;
        }

        configs.push({
          id: pid,
          modelId: targetModelId,
          platform: p.platform,
          name: p.name,
          accessToken: acc.pageAccessToken,
          pageId: acc.pageId,
          igAccountId: acc.igAccountId,
          status: acc.status === 'error' || acc.status === 'disconnected' ? 'error' : 'connected',
          reconnectPath: '/instagram',
        });
        continue;
      }

      if (p.platform === 'telegram') {
        const query = organizationId ? { _id: targetModelId, organization: organizationId } : { _id: targetModelId, user: userId };
        const acc = await TelegramAccount.findOne(query).select('+botToken');
        if (!acc) continue;

        configs.push({
          id: pid,
          modelId: targetModelId,
          platform: 'telegram',
          name: p.name || acc.botName || acc.botUsername,
          botToken: acc.botToken,
          status: acc.status === 'error' || acc.status === 'disconnected' ? 'error' : 'connected',
          defaultChatId: acc.defaultChatId || '',
          reconnectPath: '/telegram',
        });
      }

      if (p.platform === 'youtube') {
        const YoutubeAccount = require('../models/YoutubeAccount');
        const query = organizationId ? { organization: organizationId, isActive: true } : { user: userId, isActive: true };
        const ytAccount = await YoutubeAccount.findOne(query).select('+accessToken +refreshToken');

        if (!ytAccount) {
          logger.warn(`YouTube account not connected for ${organizationId ? 'org ' + organizationId : 'user ' + userId}`);
          continue;
        }

        configs.push({
          id: 'youtube_main',
          modelId: ytAccount._id,
          platform: 'youtube',
          name: ytAccount.channelName || 'YouTube Channel',
          accessToken: ytAccount.accessToken,
          refreshToken: ytAccount.refreshToken,
          expiry: ytAccount.tokenExpiry,
          status: ytAccount.isActive ? 'connected' : 'disconnected',
          reconnectPath: '/social-publishing?tab=accounts',
        });
      }

      if (p.platform === 'linkedin') {
        const query = organizationId ? { _id: pid, organization: organizationId } : { _id: pid, user: userId };
        const acc = await LinkedInAccount.findOne(query);
        if (!acc) continue;

        configs.push({
          id: pid,
          modelId: acc._id,
          platform: 'linkedin',
          name: p.name || acc.name,
          accessToken: acc.accessToken,
          linkedinId: acc.linkedinId,
          status: acc.isActive ? 'connected' : 'disconnected',
          reconnectPath: '/social-publishing?tab=accounts',
        });
      }
    }

    return configs;
  }

  static async validateCompatibility({ text = '', mediaUrls = [], hashtags = [], ctaText = '', link = '', type = 'post', platforms = [] }) {
    const warnings = [];
    const requiredFixes = [];
    const normalizedHashtags = normalizeHashtags(hashtags);
    const fullText = [text, ctaText, link].filter(Boolean).join('\n');
    
    const detectedType = this.detectContentType(type, mediaUrls);

    const axios = require('axios');
    const mediaErrors = [];
    
    await Promise.all((mediaUrls || []).map(async (url) => {
      if (!url) return;
      try {
        const res = await axios.head(url, { timeout: 5000 });
        const contentType = res.headers['content-type'] || '';
        const contentLength = res.headers['content-length'] || 0;
        
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/') && !contentType.includes('octet-stream')) {
          mediaErrors.push(`MIME validation failed: ${url} has invalid type ${contentType}`);
        }
        if (contentLength && parseInt(contentLength) < 100) {
          mediaErrors.push(`Corruption check failed: ${url} appears empty or corrupted`);
        }
      } catch (err) {
        mediaErrors.push(`Accessibility check failed: Cannot reach media ${url} (${err.message})`);
      }
    }));

    if (mediaErrors.length > 0) {
      mediaErrors.forEach(msg => requiredFixes.push({ platform: 'system', message: msg }));
    }

    platforms.forEach((p) => {
      if (p.status !== 'connected') {
        requiredFixes.push({ platform: p.platform, message: `Account validation failed: Status is ${p.status}. Please reconnect.` });
      }
      if ((p.platform === 'instagram' || p.platform === 'facebook') && !p.accessToken) {
        requiredFixes.push({ platform: p.platform, message: 'Token validation failed: Access token missing or expired.' });
      }
      if (p.platform === 'telegram' && !p.defaultChatId) {
        requiredFixes.push({ platform: 'telegram', message: 'Account validation failed: Telegram target chat/channel is missing.' });
      }
      
      const caps = this.resolveCapabilities({
        content: { mediaUrls, detectedType },
        platform: p.platform,
        account: p
      });

      if (!caps.supported) {
        caps.warnings.forEach(w => requiredFixes.push({ platform: p.platform, message: `Capability error: ${w}` }));
      } else if (caps.warnings.length > 0) {
        caps.warnings.forEach(w => warnings.push({ platform: p.platform, message: w }));
      }

      if (p.platform === 'google_business' && fullText.length > MAX_GBP_TEXT) {
        warnings.push({ platform: 'google_business', message: 'Google Business copy is long and will be trimmed.' });
      }
      if (p.platform === 'linkedin' && fullText.length < 30) {
        warnings.push({ platform: 'linkedin', message: 'LinkedIn posts perform better with more professional context.' });
      }
      if (normalizedHashtags.length > 12 && (p.platform === 'linkedin' || p.platform === 'facebook')) {
        warnings.push({ platform: p.platform, message: 'Too many hashtags may reduce readability on this platform.' });
      }
    });

    return { warnings, requiredFixes, compatible: requiredFixes.length === 0, detectedType };
  }

  static formatForPlatform({ platform, text = '', hashtags = [], ctaText = '', link = '' }) {
    const normalizedHashtags = normalizeHashtags(hashtags);
    const shortTags = normalizedHashtags.slice(0, 8);
    const lineLink = link ? `\n${link}` : '';
    const lineCta = ctaText ? `\n${ctaText}` : '';

    if (platform === 'instagram') {
      return {
        text: `${text}${lineCta}${lineLink}\n\n${normalizedHashtags.join(' ')}`.trim(),
        hashtags: normalizedHashtags,
        ctaText,
        link,
      };
    }

    if (platform === 'facebook') {
      return {
        text: `${text}${lineCta}${lineLink}\n\n${shortTags.join(' ')}`.trim(),
        hashtags: shortTags,
        ctaText,
        link,
      };
    }

    return {
      text: `${text}${lineCta}${lineLink}\n\n${normalizedHashtags.join(' ')}`.trim(),
      hashtags: normalizedHashtags,
      ctaText,
      link,
    };
  }

  static async createJob({ userId, organizationId, masterContent, mode = 'instant', scheduledAt, platforms }) {
    const normalizedType = normalizeType(masterContent.type || 'post');
    const normalizedContent = {
      ...masterContent,
      type: normalizedType,
      mediaUrls: (masterContent.mediaUrls || []).filter(Boolean),
      hashtags: normalizeHashtags(masterContent.hashtags || []),
    };

    const platformIds = platforms.map((p) => p.platform);
    const compatibility = await this.validateCompatibility({ ...normalizedContent, platforms });
    const detectedType = compatibility.detectedType || 'post';

    let preset = 'feed_portrait';
    if (detectedType === 'reel') preset = 'reel_916';
    else if (detectedType.startsWith('story_')) preset = 'story_916';
    else if (detectedType === 'image_single' || detectedType === 'video_single') preset = 'feed_portrait';

    const transformedMedia = (normalizedContent.mediaUrls || []).map(url => {
      const result = CloudinaryService.transformMediaUrl(url, preset);
      return result.url;
    });

    const contentHash = crypto
      .createHash('md5')
      .update(normalizedContent.text + (normalizedContent.mediaUrls || []).join(','))
      .digest('hex');

    const requestTimeSuffix = scheduledAt ? new Date(scheduledAt).getTime() : `instant-${Date.now()}`;

    const executions = platforms.map((p) => {
      const idempotencyKey = `${userId}-${p.platform}-${contentHash}-${requestTimeSuffix}`;

      return {
        platform: p.platform,
        accountId: String(p.id),
        accountName: p.name,
        idempotencyKey,
        status: mode === 'instant' ? 'connecting' : 'pending',
        formattedContent: {
          ...this.formatForPlatform({ platform: p.platform, ...normalizedContent }),
          mediaUrls: transformedMedia
        },
      };
    });

    return SocialPostJob.create({
      user: userId,
      organization: organizationId,
      masterContent: {
        ...normalizedContent,
        mediaUrls: transformedMedia
      },
      mode,
      scheduledAt: mode === 'scheduled' ? scheduledAt : undefined,
      selectedPlatforms: platformIds,
      compatibility: {
        warnings: compatibility.warnings,
        requiredFixes: compatibility.requiredFixes,
      },
      overallStatus: mode === 'scheduled' ? 'queued' : 'processing',
      startedAt: mode === 'instant' ? new Date() : undefined,
      executions,
    });
  }

  static async runJob(job) {
    const jobDoc = typeof job.save === 'function' ? job : await SocialPostJob.findById(job._id);
    if (!jobDoc) return null;

    if (jobDoc.overallStatus !== 'processing') {
      jobDoc.overallStatus = 'processing';
      jobDoc.startedAt = jobDoc.startedAt || new Date();
      await jobDoc.save();
    }

    const platformConfigs = await this.buildPlatformConfigs(
      jobDoc.user,
      jobDoc.executions.map((e) => ({
        id: e.accountId,
        platform: e.platform,
        name: e.accountName,
      })),
      jobDoc.organization
    );

    for (const exec of jobDoc.executions) {
      if (exec.status === 'success') continue;

      const config = platformConfigs.find((c) => c.id === exec.accountId && c.platform === exec.platform);
      if (!config) {
        exec.status = 'failed';
        exec.errorMessage = 'Platform account not found.';
        exec.humanMessage = 'Account no longer connected. Please reconnect.';
        this.emitStatus(jobDoc.user, jobDoc._id, exec);
        continue;
      }

      exec.status = 'connecting';
      exec.humanMessage = '';
      this.emitStatus(jobDoc.user, jobDoc._id, exec);
      await jobDoc.save();

      const mediaUrls = (exec.formattedContent.mediaUrls || jobDoc.masterContent.mediaUrls || []).filter(Boolean);
      const requestedType = normalizeType(jobDoc.masterContent.type || 'post');
      const detectedType = this.detectContentType(jobDoc.masterContent.type || 'post', mediaUrls);
      
      const caps = this.resolveCapabilities({
        content: { mediaUrls, detectedType },
        platform: exec.platform,
        account: config
      });
      const finalType = caps.supported ? caps.transformedType : requestedType;

      const maxAttempts = 3;
      const retryDelays = [5000, 20000, 60000];

      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (exec.idempotencyKey) {
          const alreadyPublished = await SocialPostJob.findOne({
            _id: { $ne: jobDoc._id },
            executions: {
              $elemMatch: {
                idempotencyKey: exec.idempotencyKey,
                status: 'success'
              }
            }
          });
          if (alreadyPublished) {
            const otherExec = alreadyPublished.executions.find(e => e.idempotencyKey === exec.idempotencyKey);
            exec.status = 'success';
            exec.externalPostId = otherExec.externalPostId;
            exec.humanMessage = 'Already published (idempotency).';
            this.emitStatus(jobDoc.user, jobDoc._id, exec);
            await jobDoc.save();
            break;
          }
        }

        exec.attempts = (exec.attempts || 0) + 1;

        try {
          exec.status = 'publishing';
          exec.humanMessage = attempt > 1 ? `Retrying (attempt ${attempt}/${maxAttempts})...` : 'Publishing...';
          this.emitStatus(jobDoc.user, jobDoc._id, exec);

          if (!caps.supported) {
             throw new Error(caps.warnings[0] || 'Unsupported capabilities for this platform.');
          }

          let result;
          if (exec.platform === 'instagram') {
            const ig = new InstagramService(config.accessToken, config.pageId, config.igAccountId);
            result = await ig.publishPost({ caption: exec.formattedContent.text, mediaUrls, type: finalType });
          } else if (exec.platform === 'facebook') {
            const fb = new FacebookService(config.accessToken, config.pageId);
            result = await fb.publishToFacebook(config, {
              text: exec.formattedContent.text,
              mediaUrls,
              type: finalType,
            });
          } else if (exec.platform === 'telegram') {
            const tg = new TelegramService(config.botToken);
            const chatId = config.defaultChatId;
            if (!chatId) throw new Error('Telegram target chat/channel is missing.');

            if (mediaUrls.length > 1) {
              const media = mediaUrls.map((url, idx) => ({
                type: /\.(mp4|mov|avi|wmv|m4v|webm)$/i.test(url) ? 'video' : 'photo',
                media: url,
                caption: idx === 0 ? exec.formattedContent.text : undefined,
              }));
              result = await tg.sendMediaGroup(chatId, media);
            } else if (mediaUrls.length === 1) {
              const url = mediaUrls[0];
              if (/\.(mp4|mov|avi|wmv|m4v|webm)$/i.test(url)) {
                result = await tg.sendVideo(chatId, url, exec.formattedContent.text);
              } else {
                result = await tg.sendPhoto(chatId, url, exec.formattedContent.text);
              }
            } else {
              result = await tg.sendTextMessage(chatId, exec.formattedContent.text);
            }
          } else if (exec.platform === 'youtube') {
            const youtube = new YoutubeProvider(config.accessToken, config.refreshToken, config.expiry);
            
            // Check if token is expired
            try {
              const YoutubeAccount = require('../models/YoutubeAccount');
              const ytAccount = await YoutubeAccount.findById(config.modelId).select('+refreshToken');
              const refreshed = await youtube.refreshYouTubeTokenForAccount(ytAccount);
              youtube.accessToken = refreshed.accessToken;
            } catch (refreshErr) {
              throw new Error('OAUTH_EXPIRED');
            }

            const youtubeOpts = jobDoc.masterContent.platformOptions?.get('youtube') || {};
            const ytTitle = youtubeOpts.title || jobDoc.masterContent.text || 'My Short';
            const ytDesc = youtubeOpts.description || jobDoc.masterContent.text;
            const ytComment = youtubeOpts.firstComment || '';

            try {
              result = await youtube.uploadShort(mediaUrls[0], ytTitle, ytDesc, ytComment);
            } catch (uploadErr) {
              if (uploadErr.message === 'OAUTH_EXPIRED') {
                const YoutubeAccount = require('../models/YoutubeAccount');
                const ytAccount = await YoutubeAccount.findById(config.modelId).select('+refreshToken');
                const refreshed = await youtube.refreshYouTubeTokenForAccount(ytAccount);
                result = await youtube.uploadShort(mediaUrls[0], ytTitle, ytDesc, ytComment);
              } else {
                throw uploadErr;
              }
            }
          } else if (exec.platform === 'linkedin') {
            const li = new LinkedInService(config.accessToken, config.linkedinId);
            result = await li.publishPost({ caption: exec.formattedContent.text, mediaUrls, type: finalType });
          }

          exec.status = 'success';
          exec.publishedAt = new Date();
          exec.externalPostId = result?.id || result?.result?.message_id?.toString() || '';
          exec.errorMessage = '';
          exec.humanMessage = 'Published successfully.';
          this.emitStatus(jobDoc.user, jobDoc._id, exec);
          await jobDoc.save();
          lastError = null;
          break;
        } catch (err) {
          const errorText = asErrorText(err);
          const { tokenError, fatalError, transient } = classifyError(errorText);
          lastError = errorText;

          if (tokenError) {
            exec.status = 'failed';
            exec.errorMessage = errorText;
            exec.humanMessage = 'Your account session expired. Please reconnect this platform.';
            this.emitStatus(jobDoc.user, jobDoc._id, exec);
            await this.markTokenHealthOnFailure(exec.platform, config.modelId, errorText);
            await jobDoc.save();
            break;
          }

          if (fatalError || attempt >= maxAttempts || !transient) {
            exec.status = 'failed';
            exec.errorMessage = errorText;
            exec.humanMessage = humanizeError(errorText);
            this.emitStatus(jobDoc.user, jobDoc._id, exec);
            await jobDoc.save();
            break;
          }

          const delay = retryDelays[attempt - 1] || 5000;
          exec.humanMessage = `Temporary issue detected, retrying in ${Math.round(delay / 1000)}s...`;
          this.emitStatus(jobDoc.user, jobDoc._id, exec);
          await jobDoc.save();
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (lastError && exec.status !== 'success' && !exec.errorMessage) {
        exec.errorMessage = lastError;
      }
    }

    const successCount = jobDoc.executions.filter((e) => e.status === 'success').length;
    const failedCount = jobDoc.executions.filter((e) => e.status === 'failed').length;

    jobDoc.completedAt = new Date();
    if (successCount === jobDoc.executions.length) jobDoc.overallStatus = 'completed';
    else if (failedCount === jobDoc.executions.length) jobDoc.overallStatus = 'failed';
    else jobDoc.overallStatus = 'partially_failed';

    await jobDoc.save();

    emitToUser(jobDoc.user.toString(), 'social_publish_completed', {
      jobId: jobDoc._id,
      overallStatus: jobDoc.overallStatus,
      executions: jobDoc.executions,
    });

    return jobDoc;
  }

  static emitStatus(userId, jobId, execution) {
    emitToUser(userId.toString(), 'social_publish_status', {
      jobId,
      execution: {
        platform: execution.platform,
        status: execution.status,
        attempts: execution.attempts,
        humanMessage: execution.humanMessage,
        errorMessage: execution.errorMessage,
        externalPostId: execution.externalPostId
      }
    });
  }

  static async retryFailedPlatform({ jobId, userId, platform, organizationId }) {
    const query = organizationId ? { _id: jobId, organization: organizationId } : { _id: jobId, user: userId };
    const job = await SocialPostJob.findOne(query);
    if (!job) throw new Error('Publish history item not found.');

    const exec = job.executions.find((e) => e.platform === platform && e.status === 'failed');
    if (!exec) throw new Error('No failed execution found for the selected platform.');

    exec.status = 'retrying';
    exec.humanMessage = 'Retrying publish...';
    job.overallStatus = 'processing';
    await job.save();

    return this.runJob(job);
  }

  static async markTokenHealthOnFailure(platform, modelId, rawErrorMessage) {
    const lower = String(rawErrorMessage || '').toLowerCase();

    if (lower.includes('media is not ready') || lower.includes('media id is not available') || lower.includes('unknown error')) {
      return;
    }

    const tokenIssue =
      lower.includes('access token') ||
      lower.includes('session has expired') ||
      lower.includes('token expired') ||
      (lower.includes('oauth') && lower.includes('validate'));

    if (!tokenIssue) return;

    try {
      if (platform === 'instagram') {
        await InstagramAccount.findByIdAndUpdate(modelId, {
          status: 'disconnected',
          errorMessage: 'Token expired. Please reconnect.',
        });
      }

      if (platform === 'facebook') {
        await FacebookAccount.findByIdAndUpdate(modelId, {
          status: 'disconnected',
          errorMessage: 'Token expired. Please reconnect.',
        });
      }

      if (platform === 'telegram') {
        await TelegramAccount.findByIdAndUpdate(modelId, {
          status: 'disconnected',
          errorMessage: 'Token expired or invalid. Please reconnect.',
        });
      }

      if (platform === 'linkedin') {
        await LinkedInAccount.findByIdAndUpdate(modelId, {
          isActive: false,
          errorMessage: 'LinkedIn token expired. Please reconnect.',
        });
      }
    } catch (err) {
      logger.warn(`Could not update token health for ${platform}:${modelId} - ${err.message}`);
    }
  }

  static async analytics(userId, organizationId) {
    const query = organizationId ? { organization: organizationId } : { user: userId };
    const jobs = await SocialPostJob.find(query);
    const totalPosts = jobs.length;
    const scheduledPosts = jobs.filter((j) => j.mode === 'scheduled').length;
    const failedPosts = jobs.filter((j) => ['failed', 'partially_failed'].includes(j.overallStatus)).length;

    const platformStats = {};
    jobs.forEach((j) => {
      j.executions.forEach((e) => {
        platformStats[e.platform] = platformStats[e.platform] || { total: 0, success: 0 };
        platformStats[e.platform].total += 1;
        if (e.status === 'success') platformStats[e.platform].success += 1;
      });
    });

    const platformWiseSuccessRate = Object.entries(platformStats).map(([platform, v]) => ({
      platform,
      successRate: v.total ? Math.round((v.success / v.total) * 100) : 0,
      total: v.total,
    }));

    const mostUsedPlatform = platformWiseSuccessRate.sort((a, b) => b.total - a.total)[0]?.platform || null;

    return {
      totalPostsPublished: totalPosts,
      scheduledPosts,
      failedPosts,
      platformWiseSuccessRate,
      mostUsedPlatform,
    };
  }

  static async processYouTubeQueue() {
    logger.info('Processing YouTube automation queue...');
    const pendingJobs = await SocialPostJob.find({
      overallStatus: 'queued',
      scheduledAt: { $lte: new Date() },
      selectedPlatforms: 'youtube'
    });

    for (const job of pendingJobs) {
      await this.runJob(job);
    }
  }
}

module.exports = SocialPostOrchestratorService;
