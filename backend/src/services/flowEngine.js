const Flow = require('../models/Flow');
const Contact = require('../models/Contact');
const WhatsAppService = require('./whatsappService');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/encryption');

// Temporary in-memory state store for flow execution.
// In production, this should be in Redis to survive server restarts.
const flowStateStore = new Map(); // Key: `${organizationId}_${contactPhone}`, Value: { flowId, currentNodeId }

class FlowEngine {
  
  /**
   * Checks if a contact is currently trapped in a flow.
   * If yes, it advances the flow based on their input.
   * If no, it checks if their input triggers a new flow.
   * Returns true if a flow handled the message, false if AI should handle it.
   */
  static async handleIncomingMessage(waAccount, contactPhone, userMessageText) {
    const orgId = waAccount.organization.toString();
    const stateKey = `${orgId}_${contactPhone}`;

    // 1. Check if user is already in a flow
    let activeState = flowStateStore.get(stateKey);

    if (activeState) {
      logger.info(`[FlowEngine] Contact ${contactPhone} is in active flow ${activeState.flowId}`);
      await this.advanceFlow(waAccount, contactPhone, userMessageText, activeState);
      return true; // Handled by flow
    }

    // 2. Not in a flow. Check if userMessageText triggers a flow
    if (userMessageText) {
      const keywordMatch = await Flow.findOne({ 
        organization: orgId, 
        isActive: true, 
        triggerKeyword: { $regex: new RegExp(`^${userMessageText}$`, 'i') } 
      });

      if (keywordMatch) {
        logger.info(`[FlowEngine] Contact ${contactPhone} triggered flow ${keywordMatch._id}`);
        await this.startFlow(waAccount, contactPhone, keywordMatch);
        return true; // Handled by flow
      }
    }

    return false; // Not handled by flow, pass to AI
  }

  static async startFlow(waAccount, contactPhone, flow) {
    const orgId = waAccount.organization.toString();
    const startNode = flow.nodes.find(n => n.type === 'start');
    if (!startNode) return;

    flowStateStore.set(`${orgId}_${contactPhone}`, {
      flowId: flow._id.toString(),
      currentNodeId: startNode.id,
      flow: flow // Cache the flow definition to avoid repeated DB calls
    });

    // Advance to the first actual node
    await this.advanceFlow(waAccount, contactPhone, null, flowStateStore.get(`${orgId}_${contactPhone}`));
  }

  static async advanceFlow(waAccount, contactPhone, userMessageText, activeState) {
    const { flow, currentNodeId } = activeState;
    const orgId = waAccount.organization.toString();
    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

    // Find the current node
    const currentNode = flow.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      // Reached the end or invalid node
      flowStateStore.delete(`${orgId}_${contactPhone}`);
      return;
    }

    let nextNodeId = null;

    // --- EVALUATE CURRENT NODE ---
    if (currentNode.type === 'start') {
      // Just find the next node
      const edge = flow.edges.find(e => e.source === currentNode.id);
      nextNodeId = edge ? edge.target : null;
    } 
    else if (currentNode.type === 'message') {
      // If we are evaluating a message node, we SEND the message
      if (currentNode.data?.text) {
        await waService.sendTextMessage(contactPhone, currentNode.data.text);
      }
      const edge = flow.edges.find(e => e.source === currentNode.id);
      nextNodeId = edge ? edge.target : null;
    }
    else if (currentNode.type === 'condition') {
      // Condition nodes wait for user input.
      // If userMessageText is null (we just arrived here automatically), we STOP and wait.
      if (userMessageText === null) {
        return; 
      }

      // We have user input. Evaluate it.
      const expectedAnswer = currentNode.data?.expectedAnswer || '';
      const isMatch = userMessageText.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
      
      const sourceHandle = isMatch ? 'true' : 'false';
      const edge = flow.edges.find(e => e.source === currentNode.id && e.sourceHandle === sourceHandle);
      nextNodeId = edge ? edge.target : null;
    }
    else if (currentNode.type === 'delay') {
      // Real implementation would enqueue a BullMQ job. 
      // For this prototype, we'll just skip the delay or do a setTimeout.
      const delayMs = currentNode.data?.delayMs || 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const edge = flow.edges.find(e => e.source === currentNode.id);
      nextNodeId = edge ? edge.target : null;
    }

    // --- PROCEED TO NEXT NODE ---
    if (nextNodeId) {
      activeState.currentNodeId = nextNodeId;
      // Recursively advance to execute the next node immediately (unless it's a condition that needs to wait)
      // Passing userMessageText = null because the next node should evaluate fresh
      await this.advanceFlow(waAccount, contactPhone, null, activeState);
    } else {
      // Reached a terminal node
      flowStateStore.delete(`${orgId}_${contactPhone}`);
      logger.info(`[FlowEngine] Contact ${contactPhone} completed flow ${flow._id}`);
    }
  }
}

module.exports = FlowEngine;
