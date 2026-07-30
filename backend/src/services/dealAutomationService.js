const { GoogleGenAI } = require('@google/genai');
const Deal = require('../models/Deal');
const Contact = require('../models/Contact');
const logger = require('../utils/logger');
const { emitToUser } = require('../utils/socket');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

class DealAutomationService {
  static async analyzeAndAutoUpdateDeal(conversation) {
    try {
      if (!conversation || !conversation.customerPhone || !conversation.organization) return;

      // 1. Find if a Deal exists for this customer
      const contact = await Contact.findOne({ 
        phone: conversation.customerPhone, 
        organization: conversation.organization 
      });
      if (!contact) return;

      const deal = await Deal.findOne({ 
        contact: contact._id, 
        organization: conversation.organization,
        stage: { $nin: ['WON', 'LOST'] } // only evaluate active deals
      });

      if (!deal) return;

      // 2. Extract recent messages
      const recentMessages = await conversation.getRecentMessages(6); // last 6 messages
      if (recentMessages.length < 2) return; // not enough context

      const transcript = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

      // 3. Prompt Gemini for Sentiment/Intent Analysis
      const prompt = `You are an expert AI Sales Manager evaluating a conversation between an AI Agent and a Customer.
Based on the transcript below, determine the customer's current intent and recommend if the Deal Stage should be updated.

Transcript:
${transcript}

Valid stages are:
- "WON": Customer explicitly agreed to buy, made a payment, or closed the deal.
- "LOST": Customer explicitly said they are not interested, asked to stop, or rejected.
- "OBJECTION": Customer is complaining about price, bargaining, or expressing a hesitation that needs human negotiation.
- "NO_CHANGE": Customer is just asking questions, engaging normally, or the intent hasn't shifted significantly.

Respond ONLY with a valid JSON object in this format (no markdown tags):
{
  "intent": "WON" | "LOST" | "OBJECTION" | "NO_CHANGE",
  "reason": "short explanation of why"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      let parsed;
      try {
        let text = response.text.trim();
        if (text.startsWith('\`\`\`json')) {
            text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        }
        parsed = JSON.parse(text);
      } catch (e) {
        logger.error(`[DealAutomation] Failed to parse JSON: ${response.text}`);
        return;
      }

      if (parsed.intent && parsed.intent !== 'NO_CHANGE' && parsed.intent !== deal.stage) {
        logger.info(`[DealAutomation] Detected intent shift for Deal ${deal._id}: ${deal.stage} -> ${parsed.intent}. Reason: ${parsed.reason}`);
        
        deal.stage = parsed.intent;
        deal.notes = `${deal.notes ? deal.notes + '\n' : ''}[AI Auto-Update]: Moved to ${parsed.intent}. Reason: ${parsed.reason}`;
        await deal.save();

        // Notify frontend
        emitToUser(conversation.user.toString(), 'deal_updated', {
          dealId: deal._id,
          newStage: parsed.intent,
          reason: parsed.reason
        });
      }
    } catch (err) {
      logger.error(`[DealAutomation] Error analyzing deal intent: ${err.message}`);
    }
  }
}

module.exports = DealAutomationService;
