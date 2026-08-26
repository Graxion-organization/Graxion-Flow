const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');
const redis = require('../config/redis').redis;
const ApiRequestLog = require('../models/ApiRequestLog');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

class AIService {
  static async logApiRequest(provider, modelName, requestPayload, responsePayload, status, error, startTime) {
    try {
      const processingTimeMs = Date.now() - startTime;
      await ApiRequestLog.create({
        provider,
        modelName,
        requestPayload,
        responsePayload,
        status,
        error: error ? error.toString() : null,
        processingTimeMs
      });
    } catch (err) {
      logger.error('Failed to log API request:', err);
    }
  }

  static sanitizeForWhatsApp(text) {
    if (!text) return '';
    let sanitized = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    sanitized = sanitized.replace(/###/g, '');
    sanitized = sanitized.replace(/__/g, '_');
    return sanitized.trim();
  }

  static sanitizeForPlatform(text, platform) {
    if (!text) return '';
    if (platform === 'whatsapp') {
      return this.sanitizeForWhatsApp(text);
    }
    // For Facebook, Instagram, Telegram (which don't parse standard raw markdown well in basic text msgs)
    // Strip bold (**text** -> text), italics, headers
    let sanitized = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold asterisks
    sanitized = sanitized.replace(/\*(.*?)\*/g, '$1');   // Remove single asterisks
    sanitized = sanitized.replace(/###/g, '');           // Remove headers
    sanitized = sanitized.replace(/__/g, '');            // Remove underscores
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
    const startTime = Date.now();
    let history = [];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      history = effectiveContext.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: temperature || 0.7,
        },
      });

      const result = await chat.sendMessage(userMessageText);
      const responseText = result.response.text();
      await AIService.logApiRequest('gemini', modelName, { systemPrompt, history, userMessageText }, { responseText }, 'SUCCESS', null, startTime);
      return responseText;
    } catch (error) {
      await AIService.logApiRequest('gemini', modelName, { systemPrompt, history, userMessageText }, null, 'FAILED', error, startTime);
      throw error;
    }
  }

  static async callOpenAI(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const startTime = Date.now();
    let messages = [];
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      messages = [{ role: 'system', content: systemPrompt }];
      effectiveContext.forEach(msg => {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      });
      messages.push({ role: 'user', content: userMessageText });

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: temperature || 0.7,
      });
      const responseText = completion.choices[0].message.content;
      await AIService.logApiRequest('openai', modelName, messages, completion, 'SUCCESS', null, startTime);
      return responseText;
    } catch (error) {
      await AIService.logApiRequest('openai', modelName, messages, null, 'FAILED', error, startTime);
      throw error;
    }
  }

  static async callAnthropic(modelName, systemPrompt, effectiveContext, userMessageText, temperature) {
    const startTime = Date.now();
    let messages = [];
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
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
      const responseText = msg.content[0].text;
      await AIService.logApiRequest('anthropic', modelName, { systemPrompt, messages }, msg, 'SUCCESS', null, startTime);
      return responseText;
    } catch (error) {
      await AIService.logApiRequest('anthropic', modelName, { systemPrompt, messages }, null, 'FAILED', error, startTime);
      throw error;
    }
  }

  static async callOpenRouter(modelName, systemPrompt, effectiveContext, userMessageText, temperature, useBackupKey = false) {
    const startTime = Date.now();
    let messages = [];
    try {
      const { OpenAI } = require('openai');
      const apiKey = useBackupKey && process.env.OPENROUTER_API_KEY_2 ? process.env.OPENROUTER_API_KEY_2 : process.env.OPENROUTER_API_KEY;
      
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": "WhatsApp SaaS",
        }
      });
      
      messages = [{ role: 'system', content: systemPrompt }];
      effectiveContext.forEach(msg => {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      });
      messages.push({ role: 'user', content: userMessageText });

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: temperature || 0.7,
      });
      const responseText = completion.choices[0].message.content;
      await AIService.logApiRequest('openrouter', modelName, messages, completion, 'SUCCESS', null, startTime);
      return responseText;
    } catch (error) {
      if (!useBackupKey && process.env.OPENROUTER_API_KEY_2) {
        logger.warn(`[AI_SERVICE] OpenRouter failed (${error.message || error.status}). Retrying with OPENROUTER_API_KEY_2...`);
        return await this.callOpenRouter(modelName, systemPrompt, effectiveContext, userMessageText, temperature, true);
      }
      await AIService.logApiRequest('openrouter', modelName, messages, null, 'FAILED', error, startTime);
      throw error;
    }
  }

  // WA-011: Redis Caching & WA-009: Memory Summarization
  static async generate(agent, contextMessages, userMessageText, platform, wantsVoice = false, ragContext = '', memoryContext = '') {
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
      
      // Enforce conciseness and human-like tone to reduce token usage and improve UX
      systemPrompt += `\n\n[CRITICAL SYSTEM INSTRUCTION]: You are chatting with a user on a messaging app (${platform || 'whatsapp'}). 
1. Keep your replies EXTREMELY CONCISE, short, and conversational (human-like).
2. DO NOT output large blocks of text or bulleted lists of services unless the user explicitly asks for them. 
3. If the user says a casual greeting (e.g. "Kaise ho aap", "Hi"), respond naturally with a short greeting (e.g. "Main theek hoon, aap bataiye?"). DO NOT introduce yourself or list your services on a casual greeting.
4. Save tokens by getting straight to the point in as few words as possible. Act like a human friend, not a corporate brochure.`;
      if (ragContext) {
        systemPrompt += `\n\n[Relevant Knowledge Base Context]:\n${ragContext}`;
      }
      if (memoryContext) {
        systemPrompt += `\n\n[Context Memory/Learned Profile]:\n${memoryContext}`;
      }
 
      const modelName = agent.model || 'gemini-2.5-flash';
      let responseText = '';

      try {
        if (modelName.startsWith('gpt')) {
          logger.info(`[RENDER_LOG] [AI_SERVICE] Calling OpenAI model: ${modelName}`);
          responseText = await this.callOpenAI(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else if (modelName.startsWith('claude')) {
          logger.info(`[RENDER_LOG] [AI_SERVICE] Calling Anthropic model: ${modelName}`);
          responseText = await this.callAnthropic(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else if (modelName.includes('/')) {
          logger.info(`[RENDER_LOG] [AI_SERVICE] Calling OpenRouter model: ${modelName}`);
          responseText = await this.callOpenRouter(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } else {
          logger.info(`[RENDER_LOG] [AI_SERVICE] Calling Gemini model: ${modelName}`);
          responseText = await this.callGemini(modelName, systemPrompt, effectiveContext, userMessageText, agent.temperature);
        }
      } catch (providerError) {
        logger.error(`[RENDER_LOG] [AI_SERVICE] Primary AI Provider Error (${modelName}): ${providerError.message}`);
        logger.error(`Primary AI Provider Error (${modelName}):`, providerError.message);
        logger.info(`[RENDER_LOG] [AI_SERVICE] Falling back to default Gemini model (gemini-2.5-flash)...`);
        logger.info('Falling back to default Gemini model (gemini-2.5-flash)...');
        
        try {
          // Fallback to default Gemini if primary fails
          responseText = await this.callGemini('gemini-2.5-flash', systemPrompt, effectiveContext, userMessageText, agent.temperature);
        } catch (geminiError) {
          logger.error(`[RENDER_LOG] [AI_SERVICE] Fallback Gemini Error: ${geminiError.message}`);
          logger.error(`Fallback Gemini Error:`, geminiError.message);
          
          // God-Tier Ultimate Fallback Loop
          const openRouterFallbacks = [
            'meta-llama/llama-3.3-70b-instruct',
            'google/gemini-2.5-flash',
            'qwen/qwen-2.5-72b-instruct',
            'meta-llama/llama-3.1-8b-instruct'
          ];
          
          let success = false;
          let lastErr = null;
          
          for (const fallbackModel of openRouterFallbacks) {
            try {
              logger.info(`[RENDER_LOG] [AI_SERVICE] Attempting Ultimate Fallback to OpenRouter (${fallbackModel})...`);
              logger.info(`Attempting Ultimate Fallback to OpenRouter (${fallbackModel})...`);
              responseText = await this.callOpenRouter(fallbackModel, systemPrompt, effectiveContext, userMessageText, agent.temperature);
              logger.info(`[RENDER_LOG] [AI_SERVICE] Ultimate Fallback Success with ${fallbackModel}`);
              success = true;
              break;
            } catch (openRouterErr) {
              logger.error(`[RENDER_LOG] [AI_SERVICE] OpenRouter fallback ${fallbackModel} failed: ${openRouterErr.message}`);
              logger.warn(`OpenRouter fallback ${fallbackModel} failed: ${openRouterErr.message}`);
              lastErr = openRouterErr;
            }
          }
          
          if (!success && lastErr) {
            logger.error(`[RENDER_LOG] [AI_SERVICE] ALL FALLBACKS EXHAUSTED! Final error: ${lastErr.message}`);
            throw lastErr;
          }
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
      
      // Save webhook and send email in background
      (async () => {
        try {
          // 1. Log to WebhookLog
          const WebhookLog = require('../models/WebhookLog');
          await WebhookLog.create({
            platform: platform || 'unknown',
            eventType: 'ai_generation_failed',
            payload: { userMessageText, error: error.message },
            status: 'FAILED',
            error: error.message,
          });

          // 2. Send email to agent owner
          if (agent && agent.user) {
            const User = require('../models/User');
            const owner = await User.findById(agent.user);
            if (owner && owner.email) {
              const { sendEmail, emailTemplates } = require('./emailService');
              const { subject, html } = emailTemplates.aiGenerationFailed(
                agent.name || 'AI Agent',
                platform || 'messaging',
                error.message,
                userMessageText
              );
              await sendEmail({ to: owner.email, subject, html });
            }
          }
        } catch (logErr) {
          logger.error('Failed to log WebhookLog or send error email:', logErr);
        }
      })();

      // Return null so webhook controllers skip sending a message
      return {
        content: null,
        isVoiceResponse: false,
        tokensUsed: 0,
      };
    }
  }

  static async summarizeContext(messages) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
