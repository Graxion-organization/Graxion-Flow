const Agent = require('../models/Agent');
const KeywordTrigger = require('../models/KeywordTrigger');
const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

class RoutingEngine {
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async getEmbedding(text) {
    try {
      if (!process.env.GEMINI_API_KEY) return null;
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      logger.warn(`[Embedding API] Failed to get embedding: ${err.message}`);
      return null;
    }
  }

  static calculateLocalScore(text, description) {
    if (!description) return 0;
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    if (words.length === 0) return 0;
    const desc = description.toLowerCase();
    let matches = 0;
    for (const w of words) {
      if (desc.includes(w)) matches++;
    }
    return matches / words.length;
  }

  static async route(organizationId, conversation, userMessageText) {
    logger.info(`[RoutingEngine] Evaluating routing for: "${userMessageText}"`);

    // ==========================================
    // STAGE 1: RULE ROUTER
    // ==========================================
    
    // 1a. Check keyword triggers
    try {
      const triggers = await KeywordTrigger.find({ organization: organizationId });
      for (const t of triggers) {
        let isMatch = false;
        const msg = userMessageText.trim().toLowerCase();
        const kw = t.keyword.trim().toLowerCase();
        
        if (t.matchType === 'EXACT' && msg === kw) isMatch = true;
        else if (t.matchType === 'CONTAINS' && msg.includes(kw)) isMatch = true;
        else if (t.matchType === 'REGEX') {
          try {
            const re = new RegExp(t.keyword, 'i');
            if (re.test(userMessageText)) isMatch = true;
          } catch (e) {}
        }

        if (isMatch && t.action === 'ASSIGN_AGENT' && t.response) {
          const agent = await Agent.findOne({ _id: t.response, organization: organizationId, isActive: true });
          if (agent) {
            logger.info(`[Rule Router] Keyword match directly assigned to Agent: ${agent.name}`);
            return [{ agent, confidence: 1.0 }];
          }
        }
      }
    } catch (err) {
      logger.error(`[Rule Router] Keyword triggers query error: ${err.message}`);
    }

    // 1b. Check sticky conversation lock (15 minutes expiry)
    if (conversation && conversation.agent && conversation.status === 'active') {
      const lastMsgTime = new Date(conversation.lastMessageAt || conversation.updatedAt).getTime();
      const stickyDuration = 15 * 60 * 1000; // 15 mins
      if (Date.now() - lastMsgTime < stickyDuration) {
        const agent = await Agent.findOne({ _id: conversation.agent, isActive: true });
        if (agent) {
          logger.info(`[Rule Router] Session sticky lock active for Agent: ${agent.name}`);
          return [{ agent, confidence: 1.0 }];
        }
      }
    }

    // ==========================================
    // STAGE 2: SEMANTIC ROUTER (Cosine embedding similarity)
    // ==========================================
    const agents = await Agent.find({ organization: organizationId, isActive: true });
    if (agents.length === 0) {
      logger.warn('[RoutingEngine] No active agents found for organization');
      return [];
    }
    if (agents.length === 1) {
      logger.info(`[RoutingEngine] Only one active agent (${agents[0].name}). Skipping router stages.`);
      return [{ agent: agents[0], confidence: 1.0 }];
    }

    const queryEmbedding = await this.getEmbedding(userMessageText);
    const semanticScores = [];

    for (const agent of agents) {
      let score = 0;
      const scopeText = `${agent.name} ${agent.description || ''} ${agent.systemPrompt.slice(0, 200)}`;
      
      if (queryEmbedding) {
        const agentEmbedding = await this.getEmbedding(scopeText);
        if (agentEmbedding) {
          score = this.cosineSimilarity(queryEmbedding, agentEmbedding);
        }
      }
      
      // Fallback/Reinforce with local word overlap
      const localScore = this.calculateLocalScore(userMessageText, scopeText);
      const finalSemanticScore = queryEmbedding ? (score * 0.7 + localScore * 0.3) : localScore;
      
      semanticScores.push({ agent, score: finalSemanticScore });
    }

    // Sort by score descending
    semanticScores.sort((a, b) => b.score - a.score);
    logger.info(`[Semantic Router] Top score: ${semanticScores[0].agent.name} (${semanticScores[0].score.toFixed(2)})`);

    // High confidence single intent threshold
    if (semanticScores[0].score >= 0.75 && (semanticScores.length === 1 || (semanticScores[0].score - semanticScores[1].score) >= 0.25)) {
      logger.info(`[Semantic Router] High confidence match for: ${semanticScores[0].agent.name}`);
      return [{ agent: semanticScores[0].agent, confidence: semanticScores[0].score }];
    }

    // ==========================================
    // STAGE 3: LLM ROUTER (Ambiguous or Compound Intent Parser)
    // ==========================================
    logger.info('[RoutingEngine] Ambiguity or multi-intent suspected. Calling LLM Router...');
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are a high-performance system routing engine. Your task is to evaluate a user message and assign confidence scores (between 0.00 and 1.00) indicating which agent(s) are relevant.
      User Message: "${userMessageText}"

      Available Agents:
      ${agents.map(a => `- ID: ${a._id}, Name: ${a.name}, Description: ${a.description || a.systemPrompt.slice(0, 150)}`).join('\n')}

      Rules:
      1. Respond STRICTLY with a JSON object containing "routes" array. No other markdown formatting, code block backticks or explanation.
      2. Identify all relevant agents. If a message contains multiple intents (e.g. "I want to buy X and also my order is delayed"), assign high confidence scores (> 0.75) to both matching agents.
      3. Set confidence score to 0.00 for completely irrelevant agents.
      4. If none of the agents match the intent, return an empty array.

      Expected JSON Format:
      {
        "routes": [
          { "agentId": "agent_id_here", "confidence": 0.95 },
          { "agentId": "another_agent_id", "confidence": 0.85 }
        ]
      }`;

      const response = await model.generateContent(prompt);
      const jsonResponseText = response.response.text().trim();
      const parsed = JSON.parse(jsonResponseText);

      const resolvedRoutes = [];
      if (parsed.routes && Array.isArray(parsed.routes)) {
        for (const route of parsed.routes) {
          if (route.confidence >= 0.70) {
            const targetAgent = agents.find(a => a._id.toString() === route.agentId.toString());
            if (targetAgent) {
              resolvedRoutes.push({ agent: targetAgent, confidence: route.confidence });
            }
          }
        }
      }

      if (resolvedRoutes.length > 0) {
        logger.info(`[LLM Router] Routing resolved to: ${resolvedRoutes.map(r => `${r.agent.name} (${r.confidence})`).join(', ')}`);
        return resolvedRoutes;
      }
    } catch (err) {
      logger.error(`[LLM Router] Failed to resolve: ${err.message}`);
    }

    // Default fallback to first available agent if everything else fails
    logger.warn('[RoutingEngine] Fallback routing to default/first active agent.');
    return [{ agent: agents[0], confidence: 0.50 }];
  }
}

module.exports = RoutingEngine;
