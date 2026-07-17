const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');
const redis = require('../config/redis').redis;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

class AIService {
  static sanitizeForWhatsApp(text) {
    if (!text) return '';
    let sanitized = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    sanitized = sanitized.replace(/###/g, '');
    sanitized = sanitized.replace(/__/g, '_');
    return sanitized.trim();
  }

  static isWithinBusinessHours(businessHours) {
    if (!businessHours || !businessHours.enabled) return true;

    const now = new Date();
    // Use India timezone for logic
    const timeString = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const currentHourMinute = timeString.substring(0, 5);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];

    const todayHours = businessHours[currentDay];
    if (!todayHours || !todayHours.isOpen) return false;

    if (currentHourMinute >= todayHours.start && currentHourMinute <= todayHours.end) {
      return true;
    }
    return false;
  }

  static shouldHandoffToHuman(userMessageText, handoffKeywords) {
    if (!userMessageText || !handoffKeywords || handoffKeywords.length === 0) return false;

    const lowerMessage = userMessageText.toLowerCase();
    return handoffKeywords.some((keyword) => {
      if (!keyword) return false;
      return lowerMessage.includes(keyword.toLowerCase());
    });
  }

  static async callGemini(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: effectiveContext.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: temperature || 0.7,
      },
    });

    const result = await chat.sendMessage(userMessageText);
    return result.response.text();
  }

  static async callOpenAI(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const messages = [{ role: 'system', content: systemPrompt }];
    effectiveContext.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    });
    messages.push({ role: 'user', content: userMessageText });

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: temperature || 0.7,
    });
    return completion.choices[0].message.content;
  }

  static async callAnthropic(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const messages = [];
    effectiveContext.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    });
    messages.push({ role: 'user', content: userMessageText });

    const msg = await anthropic.messages.create({
      model: modelName,
      system: systemPrompt,
      max_tokens: 1024,
      temperature: temperature || 0.7,
      messages: messages,
    });
    return msg.content[0].text;
  }

  static async callOpenRouter(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
        "X-Title": "WhatsApp SaaS",
      }
    });
    
    const messages = [{ role: 'system', content: systemPrompt }];
    effectiveContext.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    });
    messages.push({ role: 'user', content: userMessageText });

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: temperature || 0.7,
    });
    return completion.choices[0].message.content;
  }

  // WA-011: Redis Caching & WA-009: Memory Summarization
  static async generate(agent, contextMessages, userMessageText, platform, wantsVoice = false) {
    try {
      const cacheKey = `ai_cache:${agent._id}:${Buffer.from(userMessageText.toLowerCase().trim()).toString('base64')}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info(`[AI Cache Hit] Returned instant response for ${userMessageText}`);
        return { content: cached, isVoiceResponse: wantsVoice, tokensUsed: 0 };
      }

      // If context is too long, summarize it
      let effectiveContext = contextMessages;
      if (contextMessages.length > 10) {
        effectiveContext = await this.summarizeContext(contextMessages);
      }

      let systemPrompt = agent.systemPrompt || 'You are a helpful AI assistant.';
      const modelName = agent.model || 'gemini-1.5-flash';
      let responseText = '';

      try {
        if (modelName.startsWith('gpt')) {
          responseText = await this.callOpenAI(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else if (modelName.startsWith('claude')) {
          responseText = await this.callAnthropic(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else if (modelName.includes('/')) {
          responseText = await this.callOpenRouter(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else {
          responseText = await this.callGemini(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        }
      } catch (providerError) {
        logger.error(`Primary AI Provider Error (${modelName}):`, providerError.message);
        logger.info('Falling back to default Gemini model (gemini-1.5-flash)...');
        
        try {
          // Fallback to default Gemini if primary fails
          responseText = await this.callGemini('gemini-1.5-flash', systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } catch (geminiError) {
          logger.error(`Fallback Gemini Error:`, geminiError.message);
          
          // God-Tier Ultimate Fallback Loop
          const openRouterFallbacks = [
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemma-4-26b-a4b-it:free',
            'nousresearch/hermes-3-llama-3.1-405b:free'
          ];
          
          let success = false;
          let lastErr = null;
          
          for (const fallbackModel of openRouterFallbacks) {
            try {
              logger.info(`Attempting Ultimate Fallback to OpenRouter (${fallbackModel})...`);
              responseText = await this.callOpenRouter(fallbackModel, systemPrompt, effectiveContext, userMessageText, agent.temperature);
              success = true;
              break;
            } catch (openRouterErr) {
              logger.warn(`OpenRouter fallback ${fallbackModel} failed: ${openRouterErr.message}`);
              lastErr = openRouterErr;
            }
          }
          
          if (!success && lastErr) throw lastErr;
        }
      }

      // Estimate tokens (roughly 4 chars per token)
      const inputTokens = (systemPrompt.length + JSON.stringify(effectiveContext).length + userMessageText.length) / 4;
      const outputTokens = responseText.length / 4;
      const tokensUsed = Math.ceil(inputTokens + outputTokens);

      // Cache the exact match answer for 24 hours
      await redis.setex(cacheKey, 86400, responseText);

      return {
        content: responseText,
        isVoiceResponse: wantsVoice,
        tokensUsed,
      };
    } catch (error) {
      logger.error('AI generation final fallback failed:', error);
      return {
        content: "I'm experiencing some technical difficulties right now.",
        isVoiceResponse: false,
        tokensUsed: 0,
      };
    }
  }

  static async summarizeContext(messages) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt =
        'Summarize the following chat history into a dense paragraph retaining all important facts and user intents: \n' +
        JSON.stringify(messages);
      const result = await model.generateContent(prompt);
      return [{ role: 'system', content: `Previous context summary: ${result.response.text()}` }];
    } catch (err) {
      return messages; // fallback
    }
  }
}

module.exports = AIService;
