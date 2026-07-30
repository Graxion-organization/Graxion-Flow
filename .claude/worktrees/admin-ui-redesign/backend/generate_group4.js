const fs = require('fs');
const path = require('path');

const aiServiceUpdate = `const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');
const redis = require('../config/redis').redis;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

class AIService {
  static sanitizeForWhatsApp(text) {
    if (!text) return '';
    let sanitized = text.replace(/\\*\\*(.*?)\\*\\*/g, '*$1*');
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
    return handoffKeywords.some(keyword => {
      if (!keyword) return false;
      return lowerMessage.includes(keyword.toLowerCase());
    });
  }

  // WA-011: Redis Caching & WA-009: Memory Summarization
  static async generate(agent, contextMessages, userMessageText, platform, wantsVoice = false) {
    try {
      const cacheKey = \`ai_cache:\${agent._id}:\${Buffer.from(userMessageText.toLowerCase().trim()).toString('base64')}\`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        logger.info(\`[AI Cache Hit] Returned instant response for \${userMessageText}\`);
        return { content: cached, isVoiceResponse: wantsVoice, tokensUsed: 0 };
      }

      // If context is too long, summarize it
      let effectiveContext = contextMessages;
      if (contextMessages.length > 10) {
         effectiveContext = await this.summarizeContext(contextMessages);
      }

      let systemPrompt = agent.systemPrompt || 'You are a helpful AI assistant.';
      const modelName = agent.model || 'gemini-1.5-flash';
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt 
      });

      const chat = model.startChat({
        history: effectiveContext.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: agent.temperature || 0.7,
        },
      });

      const result = await chat.sendMessage(userMessageText);
      const response = result.response;
      const responseText = response.text();

      // Estimate tokens (roughly 4 chars per token)
      const inputTokens = (systemPrompt.length + JSON.stringify(effectiveContext).length + userMessageText.length) / 4;
      const outputTokens = responseText.length / 4;
      const tokensUsed = Math.ceil(inputTokens + outputTokens);

      // Cache the exact match answer for 24 hours
      await redis.setex(cacheKey, 86400, responseText);

      return {
        content: responseText,
        isVoiceResponse: wantsVoice,
        tokensUsed
      };
    } catch (error) {
      logger.error('AI generation failed:', error);
      return {
        content: "I'm experiencing some technical difficulties right now.",
        isVoiceResponse: false,
        tokensUsed: 0
      };
    }
  }

  static async summarizeContext(messages) {
    try {
       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
       const prompt = "Summarize the following chat history into a dense paragraph retaining all important facts and user intents: \\n" + JSON.stringify(messages);
       const result = await model.generateContent(prompt);
       return [{ role: 'system', content: \`Previous context summary: \${result.response.text()}\` }];
    } catch (err) {
       return messages; // fallback
    }
  }
}

module.exports = AIService;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'services', 'aiService.js'), aiServiceUpdate);

const agentControllerCode = fs.readFileSync(path.join(__dirname, 'src', 'controllers', 'agentController.js'), 'utf8');
const agentControllerUpdate = agentControllerCode + `
// WA-008: AI Response Streaming SSE
exports.streamAgentTest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { message } = req.body;
  
  const agent = await Agent.findOne({ _id: id, organization: req.organization._id });
  if (!agent) return next(new AppError('Agent not found', 404));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: agent.systemPrompt });
    
    const result = await model.generateContentStream(message);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(\`data: \${JSON.stringify({ text: chunkText })}\\n\\n\`);
    }
    
    res.write('data: [DONE]\\n\\n');
    res.end();
  } catch (err) {
    res.write(\`data: \${JSON.stringify({ error: err.message })}\\n\\n\`);
    res.end();
  }
});
`;

fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'agentController.js'), agentControllerUpdate);

// Update ai route
let aiRoutes = fs.readFileSync(path.join(__dirname, 'src', 'routes', 'ai.js'), 'utf8');
aiRoutes = aiRoutes.replace(
  "router.post('/test', agentController.testAgent);",
  "router.post('/test', agentController.testAgent);\nrouter.post('/agents/:id/stream', agentController.streamAgentTest);"
);
fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'ai.js'), aiRoutes);

console.log('Group 4 AI files created');
