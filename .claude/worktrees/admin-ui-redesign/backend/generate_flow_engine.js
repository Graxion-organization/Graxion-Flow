const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');
const servicesDir = path.join(__dirname, 'src', 'services');

const flowModel = `const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  triggerKeyword: String, // Optional: if null, might be a welcome flow
  nodes: [{
    id: String,
    type: { type: String, enum: ['start', 'message', 'condition', 'delay', 'action'] },
    data: mongoose.Schema.Types.Mixed, // text, media, delayMs, etc.
    position: { x: Number, y: Number } // For visual builder
  }],
  edges: [{
    id: String,
    source: String, // node id
    target: String, // node id
    sourceHandle: String // for condition nodes (e.g. 'true', 'false')
  }],
}, { timestamps: true });

module.exports = mongoose.model('Flow', flowSchema);
`;

const flowController = `const Flow = require('../models/Flow');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.createFlow = catchAsync(async (req, res, next) => {
  const newFlow = await Flow.create({
    organization: req.organization._id,
    ...req.body
  });
  res.status(201).json({ status: 'success', data: { flow: newFlow } });
});

exports.getFlows = catchAsync(async (req, res, next) => {
  const flows = await Flow.find({ organization: req.organization._id }).lean();
  res.status(200).json({ status: 'success', results: flows.length, data: { flows } });
});

exports.getFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOne({ _id: req.params.id, organization: req.organization._id }).lean();
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(200).json({ status: 'success', data: { flow } });
});

exports.updateFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOneAndUpdate(
    { _id: req.params.id, organization: req.organization._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(200).json({ status: 'success', data: { flow } });
});

exports.deleteFlow = catchAsync(async (req, res, next) => {
  const flow = await Flow.findOneAndDelete({ _id: req.params.id, organization: req.organization._id });
  if (!flow) return next(new AppError('Flow not found', 404));
  res.status(204).json({ status: 'success', data: null });
});
`;

const flowRoutes = `const express = require('express');
const flowController = require('../controllers/flowController');
const { protect } = require('../middleware/auth');
const { injectOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);

router.route('/')
  .get(flowController.getFlows)
  .post(flowController.createFlow);

router.route('/:id')
  .get(flowController.getFlow)
  .patch(flowController.updateFlow)
  .delete(flowController.deleteFlow);

module.exports = router;
`;

const flowEngine = `const Flow = require('../models/Flow');
const Contact = require('../models/Contact');
const WhatsAppService = require('./whatsappService');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/encryption');

// Temporary in-memory state store for flow execution.
// In production, this should be in Redis to survive server restarts.
const flowStateStore = new Map(); // Key: \`\${organizationId}_\${contactPhone}\`, Value: { flowId, currentNodeId }

class FlowEngine {
  
  /**
   * Checks if a contact is currently trapped in a flow.
   * If yes, it advances the flow based on their input.
   * If no, it checks if their input triggers a new flow.
   * Returns true if a flow handled the message, false if AI should handle it.
   */
  static async handleIncomingMessage(waAccount, contactPhone, userMessageText) {
    const orgId = waAccount.organization.toString();
    const stateKey = \`\${orgId}_\${contactPhone}\`;

    // 1. Check if user is already in a flow
    let activeState = flowStateStore.get(stateKey);

    if (activeState) {
      logger.info(\`[FlowEngine] Contact \${contactPhone} is in active flow \${activeState.flowId}\`);
      await this.advanceFlow(waAccount, contactPhone, userMessageText, activeState);
      return true; // Handled by flow
    }

    // 2. Not in a flow. Check if userMessageText triggers a flow
    if (userMessageText) {
      const keywordMatch = await Flow.findOne({ 
        organization: orgId, 
        isActive: true, 
        triggerKeyword: { $regex: new RegExp(\`^\${userMessageText}$\`, 'i') } 
      });

      if (keywordMatch) {
        logger.info(\`[FlowEngine] Contact \${contactPhone} triggered flow \${keywordMatch._id}\`);
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

    flowStateStore.set(\`\${orgId}_\${contactPhone}\`, {
      flowId: flow._id.toString(),
      currentNodeId: startNode.id,
      flow: flow // Cache the flow definition to avoid repeated DB calls
    });

    // Advance to the first actual node
    await this.advanceFlow(waAccount, contactPhone, null, flowStateStore.get(\`\${orgId}_\${contactPhone}\`));
  }

  static async advanceFlow(waAccount, contactPhone, userMessageText, activeState) {
    const { flow, currentNodeId } = activeState;
    const orgId = waAccount.organization.toString();
    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

    // Find the current node
    const currentNode = flow.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      // Reached the end or invalid node
      flowStateStore.delete(\`\${orgId}_\${contactPhone}\`);
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
      flowStateStore.delete(\`\${orgId}_\${contactPhone}\`);
      logger.info(\`[FlowEngine] Contact \${contactPhone} completed flow \${flow._id}\`);
    }
  }
}

module.exports = FlowEngine;
`;

fs.writeFileSync(path.join(modelsDir, 'Flow.js'), flowModel);
fs.writeFileSync(path.join(controllersDir, 'flowController.js'), flowController);
fs.writeFileSync(path.join(routesDir, 'flows.js'), flowRoutes);
fs.writeFileSync(path.join(servicesDir, 'flowEngine.js'), flowEngine);

// Inject into routes/index.js (server.js)
let serverCode = fs.readFileSync(path.join(__dirname, 'src', 'server.js'), 'utf8');
if (!serverCode.includes('/api/flows')) {
  serverCode = serverCode.replace(
    /app\.use\('\/api\/keywords', require\('\.\/routes\/keywords'\)\);/,
    "app.use('/api/keywords', require('./routes/keywords'));\napp.use('/api/flows', require('./routes/flows'));"
  );
  fs.writeFileSync(path.join(__dirname, 'src', 'server.js'), serverCode);
}

console.log('Group 1: Flow Builder files created');
