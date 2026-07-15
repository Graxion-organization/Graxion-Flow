const { GoogleGenAI } = require('@google/genai');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');


const STYLE_PRESETS = {
  'Social Media Post':
    'Create a high-quality social media visual with clean composition, readable focal hierarchy, and strong engagement appeal.',

  'Product Ad':
    'Create a premium product advertisement visual with commercial lighting and strong conversion appeal.',

  'Promotional Banner':
    'Create a bold promotional marketing banner with strong visual impact.',

  Minimal:
    'Create a clean minimal modern design with balanced whitespace.',

  'Modern Business':
    'Create a polished professional business creative with premium branding aesthetics.',
};

const ASPECT_RATIO_HINTS = {
  '1:1': 'Square format optimized for feed posts.',
  '4:5': 'Portrait format optimized for social feed visibility.',
  '9:16': 'Vertical format optimized for stories and reels.',
};

class GeminiImageService {
  static getCandidateModels() {
    const envModel = process.env.GEMINI_IMAGE_MODEL?.trim();

    const defaults = [
      'gemini-2.5-flash',
    ];

    return envModel
      ? [envModel, ...defaults.filter((m) => m !== envModel)]
      : defaults;
  }

  static getClient() {
    if (!process.env.GEMINI_API_KEY) {
      throw new AppError('GEMINI_API_KEY is not configured on server.', 500);
    }

    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  static buildPrompt({ prompt, style, aspectRatio }) {
    const styleInstruction =
      STYLE_PRESETS[style] || STYLE_PRESETS['Social Media Post'];

    const ratioInstruction =
      ASPECT_RATIO_HINTS[aspectRatio] || ASPECT_RATIO_HINTS['1:1'];

    return `
${styleInstruction}
${ratioInstruction}

Generate only the final visual image.

Requirements:
- No watermark
- No logo
- No borders
- Professional social media quality
- High visual clarity

User Prompt:
${prompt}
    `.trim();
  }

  static extractImageFromResponse(response) {
    const candidates = response?.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];

      for (const part of parts) {
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';

          return {
            mimeType,
            base64Data: part.inlineData.data,
            dataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
          };
        }
      }
    }

    return null;
  }

  static async generateImage({ prompt, style, aspectRatio }) {
    const finalPrompt = this.buildPrompt({ prompt, style, aspectRatio });
    let lastError;

    // 1. Try Gemini First (if key exists)
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = this.getClient();
        const candidateModels = this.getCandidateModels();

        for (const model of candidateModels) {
          try {
            logger.info(`Trying Gemini model: ${model}`);
            const response = await ai.models.generateContent({
              model,
              contents: finalPrompt,
              config: { responseModalities: ['IMAGE'] },
            });

            const imageResult = this.extractImageFromResponse(response);
            if (imageResult) {
              logger.info(`Success with model: ${model}`);
              return imageResult;
            }
            logger.warn(`No image returned from model: ${model}`);
          } catch (error) {
            logger.error(`Model ${model} failed:`, error.message);
            lastError = error;
          }
        }
      } catch (err) {
        logger.warn("Gemini client initialization failed:", err.message);
        lastError = err;
      }
    } else {
      logger.warn("No GEMINI_API_KEY found, skipping Gemini.");
    }

    // 2. Fallback to OpenRouter Free Models if API Key is configured
    if (process.env.OPENROUTER_API_KEY) {
      try {
        logger.info("Trying OpenRouter for free image generation...");
        // Using huggingface model on OpenRouter or standard completions for image
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "huggingface/black-forest-labs/flux-schnell", // Or another free image model on openrouter if it exists
            messages: [{ role: "user", content: finalPrompt }],
          })
        });
        
        // OpenRouter image generation support is experimental and varies.
        // We will catch and move to pollinations if it doesn't give a valid base64 image
        logger.warn("OpenRouter text-to-image may not return standard base64 image data automatically without specific integrations. Falling back to Pollinations...");
      } catch (e) {
        logger.warn("OpenRouter fallback failed:", e.message);
      }
    }

    // 3. Ultimate Fallback: Pollinations.ai (100% Free, no API key required)
    logger.info("Using Pollinations API for free image generation (jha free se mile)...");
    try {
      let width = 1080;
      let height = 1080;
      if (aspectRatio === '4:5') {
        width = 1080; height = 1350;
      } else if (aspectRatio === '9:16') {
        width = 1080; height = 1920;
      }

      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(finalPrompt.replace(/\n/g, ' ').substring(0, 800));
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Pollinations API error: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = 'image/jpeg';
      
      return {
        mimeType,
        base64Data,
        dataUrl: `data:${mimeType};base64,${base64Data}`
      };
    } catch (fallbackError) {
      logger.error("Free image fallback failed:", fallbackError);
      throw new AppError(
        `Image generation failed across all providers. Last error: ${fallbackError.message}`,
        502
      );
    }
  }
}

module.exports = GeminiImageService;