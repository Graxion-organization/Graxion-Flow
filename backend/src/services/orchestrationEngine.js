const Agent = require('../models/Agent');
const Contact = require('../models/Contact');
const AgentMemory = require('../models/AgentMemory');
const GlobalKnowledgeBase = require('../models/GlobalKnowledgeBase');
const RoutingEngine = require('./routingEngine');
const AIService = require('./aiService');
const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');

class OrchestrationEngine {
  static async retrieveRAG(agent, organizationId, query) {
    const chunks = [];
    
    // 1. Agent Local KB
    if (agent.knowledgeBase && agent.knowledgeBase.length > 0) {
      for (const kb of agent.knowledgeBase) {
        if (kb.textData) {
          // Simple local semantic relevancy filtering
          const queryWords = query.toLowerCase().match(/\b\w{3,}\b/g) || [];
          const text = kb.textData.toLowerCase();
          const matches = queryWords.some(word => text.includes(word));
          
          if (matches || kb.textData.length < 2000) {
            chunks.push(`[Agent Knowledge: ${kb.fileName || 'Doc'}]\n${kb.textData}`);
          }
        }
      }
    }

    // 2. Organization Global KB
    try {
      const globalKBs = await GlobalKnowledgeBase.find({ organization: organizationId, isActive: true });
      for (const g of globalKBs) {
        chunks.push(`[Global Knowledge: ${g.name}]\n${g.textData}`);
      }
    } catch (err) {
      logger.error(`[RAG Engine] Global KB fetch error: ${err.message}`);
    }

    return chunks.join('\n\n');
  }

  static async retrieveMemory(agent, organizationId, customerPhone) {
    const memoryLines = [];

    // 1. Agent Memory
    try {
      const agentMem = await AgentMemory.findOne({ agent: agent._id, customerPhone });
      if (agentMem && agentMem.memoryText) {
        memoryLines.push(`[Your Memory of Customer]: ${agentMem.memoryText}`);
      }
    } catch (err) {
      logger.error(`[Memory Engine] Agent memory query failed: ${err.message}`);
    }

    // 2. Global Customer Memory (CRM Contact)
    try {
      const contact = await Contact.findOne({ phone: customerPhone, organization: organizationId });
      if (contact) {
        if (contact.tags && contact.tags.length > 0) {
          memoryLines.push(`[Customer Tags]: ${contact.tags.join(', ')}`);
        }
        if (contact.customFields && contact.customFields.size > 0) {
          const fields = [];
          contact.customFields.forEach((val, key) => fields.push(`${key}: ${val}`));
          memoryLines.push(`[Customer Attributes]: ${fields.join(', ')}`);
        }
      }
    } catch (err) {
      logger.error(`[Memory Engine] Contact profile query failed: ${err.message}`);
    }

    return memoryLines.join('\n');
  }

  static async synthesizeResponses(userMessageText, agentResponses) {
    logger.info('[OrchestrationEngine] Synthesizing responses from multiple agents...');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are a Senior Response Synthesizer for an AI Multi-Agent Platform.
      The user sent a message that triggered multiple specialized AI agents. Your job is to combine their answers into a single, cohesive, friendly, and non-redundant response for the user.

      User Message: "${userMessageText}"

      Draft Responses from Agents:
      ${agentResponses.map(r => `[Agent: ${r.agent.name}]\n${r.response.content}`).join('\n\n')}

      Instructions:
      1. Combine the information logically. Address all parts of the user query.
      2. Avoid duplicate greetings, signature blocks, or repetitive instructions.
      3. Deliver the combined response directly without meta-text (like "Here is the combined response...").`;

      const response = await model.generateContent(prompt);
      return response.response.text().trim();
    } catch (err) {
      logger.error(`[Aggregation Engine] Failed to synthesize responses: ${err.message}`);
      // Fallback: Concatenate with newline separator
      return agentResponses.map(r => r.response.content).join('\n\n');
    }
  }

  static async execute({
    organizationId,
    conversation,
    userMessageText,
    contextMessages,
    from,
    wantsVoice
  }) {
    // 1. Call Routing Engine
    const routes = await RoutingEngine.route(organizationId, conversation, userMessageText);
    if (routes.length === 0) {
      throw new Error('No active agents routed to handle this message.');
    }

    // 2. Parallel execution of agents
    const agentResponses = await Promise.all(routes.map(async ({ agent, confidence }) => {
      const ragContext = await this.retrieveRAG(agent, organizationId, userMessageText);
      const memoryContext = await this.retrieveMemory(agent, organizationId, from);

      logger.info(`[Orchestrator] Executing Agent: ${agent.name} (confidence: ${confidence.toFixed(2)})`);
      const response = await AIService.generate(
        agent,
        contextMessages,
        userMessageText,
        'whatsapp',
        wantsVoice,
        ragContext,
        memoryContext
      );

      return { agent, response, confidence };
    }));

    // 3. Synthesis & Aggregation
    let finalContent = '';
    let totalTokens = 0;
    let primaryAgent = null;
    
    if (agentResponses.length === 1) {
      finalContent = agentResponses[0].response.content;
      totalTokens = agentResponses[0].response.tokensUsed;
      primaryAgent = agentResponses[0].agent;
    } else {
      finalContent = await this.synthesizeResponses(userMessageText, agentResponses);
      totalTokens = agentResponses.reduce((sum, r) => sum + r.response.tokensUsed, 0) + 150; // Add routing overhead estimate
      
      // Select the agent with the highest confidence as the primary/sticky agent
      const sorted = [...agentResponses].sort((a, b) => b.confidence - a.confidence);
      primaryAgent = sorted[0].agent;
    }

    return {
      content: finalContent,
      tokensUsed: totalTokens,
      agent: primaryAgent
    };
  }
}

module.exports = OrchestrationEngine;
