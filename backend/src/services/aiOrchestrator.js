const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
const logger = require('../utils/logger');


// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Calls Gemini 2.5 Flash. Falls back to Gemini 2.5 Pro, then OpenRouter (DeepSeek) if it fails.
 */
const generateResponse = async (prompt, contextData) => {
  const fullPrompt = `Context:\n${JSON.stringify(contextData)}\n\nQuestion:\n${prompt}`;

  try {
    // 1. Try Gemini 2.5 Flash
    logger.info('Attempting Gemini 2.5 Flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    return response.text;
  } catch (error) {
    logger.warn('Gemini 2.5 Flash failed, attempting fallback to OpenRouter (DeepSeek)...', error.message);
    
    // 2. Fallback to OpenRouter (DeepSeek)
    try {
      const openRouterResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an AI Teacher explaining concepts in Hindi/English.' },
            { role: 'user', content: fullPrompt }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'AI Teacher SaaS',
          }
        }
      );
      
      return openRouterResponse.data.choices[0].message.content;
    } catch (openRouterError) {
      logger.error('OpenRouter fallback failed:', openRouterError.message);
      return 'I am currently experiencing network issues. Please try again in a moment.';
    }
  }
};

module.exports = { generateResponse };
