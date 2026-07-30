const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const CloudinaryService = require('./cloudinaryService');
const GeminiImageService = require('./geminiImageService');
const StockMediaService = require('./stockMediaService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class MarketingCopilotService {
  /**
   * Initialize and return Google GenAI client if key exists
   */
  static getGeminiClient() {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('[MarketingCopilot] GEMINI_API_KEY not configured.');
      return null;
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Helper to perform text generation using Gemini or OpenRouter free models
   */
  static async generateText(systemPrompt, userPrompt) {
    const ai = this.getGeminiClient();

    // 1. Try Gemini first
    if (ai) {
      try {
        logger.info('[MarketingCopilot] Generating text using Gemini-2.5-pro...');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: `${systemPrompt}\n\nUser Input:\n${userPrompt}`,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } catch (err) {
        logger.error('[MarketingCopilot] Gemini-2.5-pro error, falling back to gemini-2.5-flash:', err.message);
        try {
          logger.info('[MarketingCopilot] Generating text using Gemini-2.5-flash...');
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nUser Input:\n${userPrompt}`,
            config: {
              responseMimeType: 'application/json'
            }
          });

          const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } catch (flashErr) {
          logger.error('[MarketingCopilot] Gemini-2.5-flash text generation error:', flashErr.message);
        }
      }
    }

    // 2. Try OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        logger.info('[MarketingCopilot] Generating text using OpenAI (gpt-4o-mini)...');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        });

        const text = response.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } catch (err) {
        logger.error('[MarketingCopilot] OpenAI text generation error:', err.message);
      }
    }

    // 3. Try Anthropic if configured
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        logger.info('[MarketingCopilot] Generating text using Anthropic (claude-3-5-sonnet)...');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        const text = response.content?.[0]?.text;
        if (text) return text.trim();
      } catch (err) {
        logger.error('[MarketingCopilot] Anthropic text generation error:', err.message);
      }
    }

    // 4. Fallback to OpenRouter Free Llama-3 model if others are unconfigured or failed
    logger.info('[MarketingCopilot] Falling back to OpenRouter LLM...');
    try {
      const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
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

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content.trim();
      throw new Error(data.error?.message || 'Empty response from OpenRouter');
    } catch (err) {
      logger.error('[MarketingCopilot] OpenRouter text generation error:', err.message);
      throw new AppError('Strategy generation failed across all AI providers. Please check server API keys.', 502);
    }
  }

  /**
   * Generate Viral Marketing Strategy
   */
  static async generateStrategy(businessDetails) {
    const systemPrompt = `You are a world-class growth marketer and brand strategist. Your job is to create a viral growth and marketing strategy for a business based on its profile.
You must return your response in JSON format. Do not write any markdown blocks like \`\`\`json or regular text outside the JSON. Return only the raw JSON.
The JSON must strictly match this structure:
{
  "overallHook": "String detailing the core viral hook or campaign theme.",
  "targetPlatforms": ["Array of social media platforms recommended."],
  "postingRoutine": "String describing the recommended weekly posting routine (e.g., '3 Reels per week, 2 text posts').",
  "adStrategy": "String describing paid ad strategies, including keyword targeting, budget recommendations, and ad formats.",
  "actionPlan": ["Array of 5 sequential steps to take immediately."]
}`;

    const userPrompt = `
Business Details:
- Name: ${businessDetails.name}
- Hours: ${businessDetails.timings || 'Not Specified'}
- Model/Type: ${businessDetails.businessModel || 'Not Specified'}
- Category: ${businessDetails.category || 'Not Specified'}
- Description: ${businessDetails.description || 'Not Specified'}
- Products/Services: ${businessDetails.products || 'Not Specified'}
- Target Audience: ${businessDetails.targetAudience || 'Not Specified'}
- Brand Tone: ${businessDetails.tone || 'Not Specified'}
- Desired Platforms: ${businessDetails.platforms?.join(', ') || 'All Platforms'}
    `.trim();

    const rawJson = await this.generateText(systemPrompt, userPrompt);
    try {
      // Strip any accidental markdown formatting if present
      const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      logger.error('[MarketingCopilot] Strategy JSON parse error:', err.message, 'Raw response:', rawJson);
      throw new AppError('AI returned a malformed strategy. Please try again.', 502);
    }
  }

  /**
   * Generate 30-Day Content Calendar
   */
  static async generateCalendar(businessDetails, strategy) {
    const systemPrompt = `You are a professional social media manager. Your task is to generate a 30-day content calendar based on the brand details and marketing strategy.
You MUST generate exactly 30 high-quality posts (one post for each day from Day 1 to Day 30).
You must return your response in JSON format. Do not write any markdown blocks like \`\`\`json or regular text outside the JSON. Return only the raw JSON.
The JSON must be a list of exactly 30 post objects:
[
  {
    "day": 1,
    "theme": "Brief post theme or topic.",
    "type": "post" | "reel" | "story" | "carousel",
    "platforms": ["instagram", "facebook", "linkedin", "youtube", "telegram"], // subset of selected platforms
    "caption": "Complete post caption with hooks, body, hashtags, and a clear call-to-action.",
    "imagePrompt": "Detailed prompt for generating a beautiful, highly relevant image using AI. Must specify subject, style, colors, composition.",
    "videoScript": "Visual and spoken script for a video if the type is reel/video. Instructions on overlays and music.",
    "slides": [
      {
        "slideNumber": 1,
        "heading": "Big bold text to write on the graphic slide/poster.",
        "body": "Brief supporting body text for the graphic slide.",
        "imagePrompt": "Image description for this specific slide's visual design/background."
      }
    ] // For type "carousel" or slide-based "reel", provide a list of slides (usually 3 to 7 slides). If the post type is a standard "post" or "story" that does not have multiple slides, you can leave this array empty or omit it.
  },
  ...
]`;

    const contactInfo = businessDetails.contactDetails ? `
Contact Details (Must include in post call-to-actions/captions naturally where appropriate):
- Phone: ${businessDetails.contactDetails.phone || 'Not Specified'}
- Email: ${businessDetails.contactDetails.email || 'Not Specified'}
- Website: ${businessDetails.contactDetails.website || 'Not Specified'}
- Address: ${businessDetails.contactDetails.address || 'Not Specified'}
` : '';

    const userPrompt = `
Business Name: ${businessDetails.name}
Business Description: ${businessDetails.description || 'Not Specified'}
Key Products: ${businessDetails.products || 'Not Specified'}
Tone: ${businessDetails.tone || 'Not Specified'}
Platforms: ${businessDetails.platforms?.join(', ') || 'All Platforms'}
${contactInfo}

Strategy:
- Hook: ${strategy.overallHook}
- Recommended Routine: ${strategy.postingRoutine}
- Focus Platforms: ${strategy.targetPlatforms?.join(', ')}
    `.trim();

    const rawJson = await this.generateText(systemPrompt, userPrompt);
    try {
      const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      logger.error('[MarketingCopilot] Calendar JSON parse error:', err.message, 'Raw response:', rawJson);
      throw new AppError('AI returned a malformed content calendar. Please try again.', 502);
    }
  }

  /**
   * Convert Static Image to Video using FFmpeg
   */
  static async convertImageToVideo(imageUrl) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempImgPath = path.join(tempDir, `img_${Date.now()}.png`);
    const tempVidPath = path.join(tempDir, `vid_${Date.now()}.mp4`);

    try {
      logger.info(`[MarketingCopilot] Downloading AI image to convert to video: ${imageUrl}`);
      const imageResponse = await axios({
        url: imageUrl,
        responseType: 'stream'
      });

      await new Promise((resolve, reject) => {
        const stream = imageResponse.data.pipe(fs.createWriteStream(tempImgPath));
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // 5 second visual zoom / loop video from single image
      // Scale to 540x960 (9:16 portrait) optimized for low memory usage (prevents 512MB OOM)
      const ffmpegCmd = `ffmpeg -y -loop 1 -i "${tempImgPath}" -c:v libx264 -preset ultrafast -t 5 -pix_fmt yuv420p -vf "scale=540:960:force_original_aspect_ratio=increase,crop=540:960" "${tempVidPath}"`;
      
      logger.info(`[MarketingCopilot] Compiling video with FFmpeg...`);
      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (error, stdout, stderr) => {
          if (error) {
            logger.error('[MarketingCopilot] FFmpeg error:', stderr || error.message);
            reject(error);
          } else {
            resolve();
          }
        });
      });

      logger.info(`[MarketingCopilot] Uploading video to Cloudinary...`);
      const uploadResult = await CloudinaryService.upload(tempVidPath, {
        resource_type: 'video',
        folder: 'social_hub/ai_videos'
      });

      return uploadResult.url;
    } finally {
      // Clean up temp files safely
      try {
        if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
        if (fs.existsSync(tempVidPath)) fs.unlinkSync(tempVidPath);
      } catch (e) {
        logger.warn('[MarketingCopilot] Temp file deletion warning:', e.message);
      }
    }
  }

  /**
   * Process and Generate Assets (AI Image or Stock/AI Video) for a specific post
   */
  static async generateAssets(post, useStockVideo = false) {
    try {
      const isVideo = post.type === 'reel' || post.type === 'video';

      if (isVideo) {
        if (useStockVideo) {
          logger.info(`[MarketingCopilot] Asset generation: Stock Video mode. Searching stock video.`);
          const stockUrl = await StockMediaService.getVideoUrl(post.theme || post.caption);
          return { url: stockUrl, mediaType: 'video' };
        } else {
          logger.info(`[MarketingCopilot] Asset generation: AI Image-to-Video mode.`);
          // 1. Generate image first
          const imageResult = await GeminiImageService.generateImage({
            prompt: post.imagePrompt,
            style: 'Social Media Post',
            aspectRatio: '9:16'
          });
          const uploadedImg = await CloudinaryService.upload(imageResult.dataUrl, {
            resource_type: 'image',
            folder: 'social_hub/ai_generated'
          });
          
          // 2. Compile image to video
          try {
            const videoUrl = await this.convertImageToVideo(uploadedImg.url);
            return { url: videoUrl, mediaType: 'video' };
          } catch (ffmpegErr) {
            logger.warn('[MarketingCopilot] FFmpeg failed, falling back to stock video search...');
            const stockUrl = await StockMediaService.getVideoUrl(post.theme || post.caption);
            return { url: stockUrl, mediaType: 'video' };
          }
        }
      } else {
        // Standard Image post, Story or Carousel
        logger.info(`[MarketingCopilot] Asset generation: Standard AI Image.`);
        const aspectRatio = post.type === 'story' ? '9:16' : '1:1';
        const imageResult = await GeminiImageService.generateImage({
          prompt: post.imagePrompt,
          style: 'Social Media Post',
          aspectRatio
        });
        const uploadedImg = await CloudinaryService.upload(imageResult.dataUrl, {
          resource_type: 'image',
          folder: 'social_hub/ai_generated'
        });
        return { url: uploadedImg.url, mediaType: 'image' };
      }
    } catch (err) {
      logger.error('[MarketingCopilot] Asset generation error:', err.message);
      throw new AppError(`Asset generation failed: ${err.message}`, 502);
    }
  }
}

module.exports = MarketingCopilotService;
