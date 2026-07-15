const { GoogleGenAI } = require('@google/genai');
const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

const PLATFORM_LIMITS = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
  youtube: 100,
  twitter: 280,
  telegram: 4096,
};

const PLATFORM_TIPS = {
  instagram: 'Use 5-10 relevant hashtags at the end. Emojis increase engagement.',
  facebook: 'Conversational tone works best. Keep it under 200 chars for max reach.',
  linkedin: 'Professional tone. Start with a hook. No more than 3-5 hashtags.',
  youtube: 'Keep title under 60 chars. Include primary keyword at the start.',
  telegram: 'Direct and clear. Emojis ok but keep it concise.',
};

const GENRE_PROMPTS = {
  product: 'Write a compelling product showcase post',
  event: 'Write an engaging event announcement post',
  motivational: 'Write an inspiring motivational post',
  question: 'Write an engaging question-based post to spark discussion',
  story: 'Write a personal story-style post that connects emotionally',
  promotional: 'Write a promotional post with a clear call-to-action',
  educational: 'Write an informative educational post',
  behind_scenes: 'Write a behind-the-scenes post that feels authentic',
};

const TONE_PROMPTS = {
  professional: 'Use a professional, authoritative tone',
  casual: 'Use a casual, friendly, conversational tone',
  humorous: 'Use a light-hearted, witty, and fun tone',
  urgent: 'Use an urgent, action-driving tone with FOMO elements',
  inspirational: 'Use an uplifting, aspirational tone',
};

class AICaptionService {
  static async getGeminiClient() {
    const settings = await SystemSetting.find({ key: { $in: ['gemini_api_key', 'openai_api_key'] } });
    const geminiKey = settings.find(s => s.key === 'gemini_api_key')?.value || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      return new GoogleGenAI({ apiKey: geminiKey });
    }
    throw new Error('No AI API key configured. Please add Gemini API key in system settings.');
  }

  /**
   * Generate an optimized social media caption
   * @param {Object} params
   * @param {string} params.platform - Target platform
   * @param {string} params.genre - Content genre (product, event, motivational, etc.)
   * @param {string} params.tone - Writing tone (professional, casual, humorous, urgent)
   * @param {string} params.context - Additional context about the post
   * @param {string} params.brandName - Optional brand/business name
   * @param {string} params.targetAudience - Optional target audience description
   * @returns {Promise<{caption, hashtags, tips, charCount}>}
   */
  static async generateCaption({ platform = 'instagram', genre = 'product', tone = 'casual', context = '', brandName = '', targetAudience = '' }) {
    const genrePrompt = GENRE_PROMPTS[genre] || GENRE_PROMPTS.product;
    const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.casual;
    const charLimit = PLATFORM_LIMITS[platform] || 2200;
    const platformTip = PLATFORM_TIPS[platform] || '';

    const systemInstruction = `You are an expert social media copywriter specializing in ${platform} content. 
You create viral, engaging captions that drive real engagement and results.
${platformTip}

RULES:
- Keep caption under ${charLimit} characters
- For Instagram/Facebook/LinkedIn: include relevant hashtags
- For YouTube: generate a compelling video title (not caption)
- Return ONLY valid JSON, no markdown code blocks
- Be creative, authentic, and platform-native`;

    const userPrompt = `${genrePrompt} for ${platform}.
${tonePrompt}.
${context ? `Context/Topic: ${context}` : ''}
${brandName ? `Brand/Business: ${brandName}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Return a JSON object with this exact structure:
{
  "caption": "the main post caption text (without hashtags for instagram/fb)",
  "hashtags": ["array", "of", "relevant", "hashtags", "without", "# symbol"],
  "hook": "first 10 words of caption that grab attention",
  "callToAction": "suggested call to action"
}`;

    try {
      const ai = await this.getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          temperature: 0.8,
          maxOutputTokens: 800,
        },
      });

      let raw = response.text?.trim() || '{}';
      // Strip markdown code blocks if present
      raw = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

      const parsed = JSON.parse(raw);

      const caption = parsed.caption || '';
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 30) : [];
      const hook = parsed.hook || caption.split(' ').slice(0, 8).join(' ');
      const callToAction = parsed.callToAction || '';

      // Build full caption for instagram/facebook
      let fullCaption = caption;
      if (['instagram', 'facebook', 'linkedin'].includes(platform) && hashtags.length > 0) {
        const maxHashtags = platform === 'linkedin' ? 5 : platform === 'facebook' ? 8 : 15;
        const selectedTags = hashtags.slice(0, maxHashtags).map(h => `#${h.replace(/^#/, '')}`);
        fullCaption = `${caption}\n\n${selectedTags.join(' ')}`;
      }

      return {
        caption: fullCaption,
        rawCaption: caption,
        hashtags: hashtags.map(h => h.replace(/^#/, '')),
        hook,
        callToAction,
        charCount: fullCaption.length,
        platform,
        genre,
        tone,
      };
    } catch (err) {
      logger.error('AI Caption generation failed with Gemini, attempting OpenAI fallback:', err.message);
      try {
        return await this.generateCaptionOpenAI({ platform, genre, tone, context, brandName, targetAudience });
      } catch (openaiErr) {
        logger.error('AI Caption generation failed with OpenAI, attempting OpenRouter fallback:', openaiErr.message);
        try {
          return await this.generateCaptionOpenRouter({ platform, genre, tone, context, brandName, targetAudience });
        } catch (orErr) {
          logger.error('All AI Caption fallback methods failed:', orErr.message);
          throw orErr;
        }
      }
    }
  }

  static async generateCaptionOpenAI({ platform, genre, tone, context, brandName, targetAudience }) {
    const OpenAI = require('openai');
    const settings = await SystemSetting.find({ key: 'openai_api_key' });
    const openaiKey = settings.find(s => s.key === 'openai_api_key')?.value || process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      throw new Error('No OpenAI API key configured. Attempting next fallback.');
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const genrePrompt = GENRE_PROMPTS[genre] || GENRE_PROMPTS.product;
    const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.casual;
    const charLimit = PLATFORM_LIMITS[platform] || 2200;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert social media copywriter for ${platform}. Return only valid JSON.`
        },
        {
          role: 'user',
          content: `${genrePrompt} for ${platform}. ${tonePrompt}. Context: ${context}. Brand: ${brandName}. Audience: ${targetAudience}. Keep under ${charLimit} chars. Return JSON: {"caption":"...","hashtags":["..."],"hook":"...","callToAction":"..."}`
        }
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    const caption = parsed.caption || '';
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    
    const maxHashtags = platform === 'linkedin' ? 5 : platform === 'facebook' ? 8 : 15;
    const selectedTags = hashtags.slice(0, maxHashtags).map(h => `#${h.replace(/^#/, '')}`);
    const fullCaption = ['instagram', 'facebook', 'linkedin'].includes(platform) && selectedTags.length
      ? `${caption}\n\n${selectedTags.join(' ')}`
      : caption;

    return {
      caption: fullCaption,
      rawCaption: caption,
      hashtags: hashtags.map(h => h.replace(/^#/, '')),
      hook: parsed.hook || '',
      callToAction: parsed.callToAction || '',
      charCount: fullCaption.length,
      platform,
      genre,
      tone,
    };
  }

  static async generateCaptionOpenRouter({ platform, genre, tone, context, brandName, targetAudience }) {
    const settings = await SystemSetting.find({ key: 'openrouter_api_key' });
    const openrouterKey = settings.find(s => s.key === 'openrouter_api_key')?.value || process.env.OPENROUTER_API_KEY;
    
    if (!openrouterKey) {
      throw new Error('No OpenRouter API key configured. Please configure OpenRouter API key in settings or environment.');
    }

    const genrePrompt = GENRE_PROMPTS[genre] || GENRE_PROMPTS.product;
    const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.casual;
    const charLimit = PLATFORM_LIMITS[platform] || 2200;

    const systemPrompt = `You are an expert social media copywriter for ${platform}. Return only valid JSON.`;
    const userPrompt = `${genrePrompt} for ${platform}. ${tonePrompt}. Context: ${context}. Brand: ${brandName}. Audience: ${targetAudience}. Keep under ${charLimit} chars. Return JSON: {"caption":"...","hashtags":["..."],"hook":"...","callToAction":"..."}`;

    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(data.error?.message || 'Empty response from OpenRouter');
    }

    let raw = content.trim();
    raw = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    const parsed = JSON.parse(raw);
    const caption = parsed.caption || '';
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    
    const maxHashtags = platform === 'linkedin' ? 5 : platform === 'facebook' ? 8 : 15;
    const selectedTags = hashtags.slice(0, maxHashtags).map(h => `#${h.replace(/^#/, '')}`);
    const fullCaption = ['instagram', 'facebook', 'linkedin'].includes(platform) && selectedTags.length
      ? `${caption}\n\n${selectedTags.join(' ')}`
      : caption;

    return {
      caption: fullCaption,
      rawCaption: caption,
      hashtags: hashtags.map(h => h.replace(/^#/, '')),
      hook: parsed.hook || '',
      callToAction: parsed.callToAction || '',
      charCount: fullCaption.length,
      platform,
      genre,
      tone,
    };
  }

  /**
   * Get platform-specific limits and tips
   */
  static getPlatformInfo(platform) {
    return {
      charLimit: PLATFORM_LIMITS[platform] || 2200,
      tips: PLATFORM_TIPS[platform] || '',
      genres: Object.keys(GENRE_PROMPTS),
      tones: Object.keys(TONE_PROMPTS),
    };
  }

  /**
   * Get best time suggestions based on post history
   * @param {Array} recentJobs - Recent SocialPostJob documents
   * @param {string} platform 
   */
  static getBestTimeToPost(recentJobs = [], platform = 'instagram') {
    // Industry average best times by platform (IST timezone)
    const INDUSTRY_DEFAULTS = {
      instagram: [
        { time: '08:00', label: '8 AM', reason: 'Morning scroll peak' },
        { time: '12:00', label: '12 PM', reason: 'Lunch break traffic' },
        { time: '19:00', label: '7 PM', reason: 'Evening high engagement' },
      ],
      facebook: [
        { time: '09:00', label: '9 AM', reason: 'Office hours start' },
        { time: '13:00', label: '1 PM', reason: 'Post-lunch engagement' },
        { time: '20:00', label: '8 PM', reason: 'Prime evening time' },
      ],
      linkedin: [
        { time: '08:00', label: '8 AM', reason: 'Pre-work browsing' },
        { time: '12:00', label: '12 PM', reason: 'Business lunch scrolling' },
        { time: '17:00', label: '5 PM', reason: 'Post-work wind down' },
      ],
      youtube: [
        { time: '14:00', label: '2 PM', reason: 'Afternoon views peak' },
        { time: '17:00', label: '5 PM', reason: 'After school/work' },
        { time: '20:00', label: '8 PM', reason: 'Prime time viewing' },
      ],
      telegram: [
        { time: '09:00', label: '9 AM', reason: 'Morning notification check' },
        { time: '19:00', label: '7 PM', reason: 'Evening message check' },
      ],
    };

    // If we have enough history data, analyze patterns
    if (recentJobs.length >= 5) {
      const successfulJobs = recentJobs.filter(j => 
        j.overallStatus === 'completed' && 
        j.executions?.some(e => e.platform === platform && e.status === 'success')
      );

      if (successfulJobs.length >= 3) {
        const hourCounts = {};
        successfulJobs.forEach(job => {
          const publishedAt = job.executions?.find(e => e.platform === platform)?.publishedAt;
          if (publishedAt) {
            const hour = new Date(publishedAt).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        });

        const topHours = Object.entries(hourCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([hour]) => {
            const h = parseInt(hour);
            const timeStr = `${String(h).padStart(2, '0')}:00`;
            return {
              time: timeStr,
              label: h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h === 0 ? 12 : h} AM`,
              reason: 'Based on your post history',
              fromHistory: true,
            };
          });

        if (topHours.length > 0) {
          return { suggestions: topHours, source: 'history' };
        }
      }
    }

    return {
      suggestions: INDUSTRY_DEFAULTS[platform] || INDUSTRY_DEFAULTS.instagram,
      source: 'industry_average',
    };
  }
}

module.exports = AICaptionService;
