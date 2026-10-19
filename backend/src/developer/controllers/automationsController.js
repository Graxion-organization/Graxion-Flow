const mongoose = require('mongoose');
const Agent = require('../../models/Agent');
const Flow = require('../../models/Flow');
const WhatsappAccount = require('../../models/WhatsappAccount');
const AIService = require('../../services/aiService');
const FlowEngine = require('../../services/flowEngine');
const outboundWebhookService = require('../../services/outboundWebhookService');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

exports.listAgents = async (req, res) => {
  try {
    const agents = await Agent.find({ organization: req.organization._id })
      .select('name description platform platforms agentType aiProvider model responseLanguage isActive isDefault stats createdAt updatedAt')
      .sort('-createdAt')
      .lean();

    return sendDeveloperSuccess(req, res, 200, { agents }, { total: agents.length });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'AGENTS_LIST_ERROR', 'Failed to list AI agents.');
  }
};

exports.invokeAgent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid agent ID format.');
    }

    const agent = await Agent.findOne({
      _id: id,
      organization: req.organization._id
    });

    if (!agent) {
      return sendDeveloperError(req, res, 404, 'AGENT_NOT_FOUND', 'AI agent not found in workspace.');
    }

    if (!agent.isActive) {
      return sendDeveloperError(req, res, 400, 'AGENT_INACTIVE', 'AI agent is currently disabled.');
    }

    const { message, conversationHistory = [] } = req.body;
    const result = await AIService.generate(agent, conversationHistory, message);

    return sendDeveloperSuccess(req, res, 200, {
      agentId: agent._id,
      agentName: agent.name,
      response: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed || 0,
      responseTimeMs: result.responseTime || 0
    });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'AGENT_INVOKE_ERROR', err.message || 'Failed to invoke AI agent.');
  }
};

exports.listFlows = async (req, res) => {
  try {
    const flows = await Flow.find({ organization: req.organization._id })
      .sort('-createdAt')
      .lean();

    return sendDeveloperSuccess(req, res, 200, { flows }, { total: flows.length });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'FLOWS_LIST_ERROR', 'Failed to list automation flows.');
  }
};

exports.getFlow = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid flow ID format.');
    }

    const flow = await Flow.findOne({
      _id: id,
      organization: req.organization._id
    }).lean();

    if (!flow) {
      return sendDeveloperError(req, res, 404, 'FLOW_NOT_FOUND', 'Automation flow not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { flow });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'FLOW_GET_ERROR', 'Failed to retrieve automation flow.');
  }
};

exports.triggerFlow = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid flow ID format.');
    }

    const flow = await Flow.findOne({
      _id: id,
      organization: req.organization._id
    }).lean();

    if (!flow) {
      return sendDeveloperError(req, res, 404, 'FLOW_NOT_FOUND', 'Automation flow not found in workspace.');
    }

    if (!flow.isActive) {
      return sendDeveloperError(req, res, 400, 'FLOW_INACTIVE', 'Automation flow is not active.');
    }

    const startNode = (flow.nodes || []).find((n) => n.type === 'start');
    if (!startNode) {
      return sendDeveloperError(req, res, 422, 'INVALID_FLOW_DEFINITION', 'Flow does not contain a start node.');
    }

    const { contactPhone, dryRun } = req.body;
    const normalizedPhone = String(contactPhone).replace(/\D/g, '');

    if (dryRun) {
      return sendDeveloperSuccess(req, res, 200, {
        triggered: false,
        dryRun: true,
        flowId: flow._id,
        flowName: flow.name,
        contactPhone: normalizedPhone,
        startNodeId: startNode.id,
        nodeCount: (flow.nodes || []).length
      });
    }

    const waAccount = await WhatsappAccount.findOne({
      organization: req.organization._id,
      status: 'connected',
      isActive: true
    }).select('+accessToken');

    if (!waAccount) {
      return sendDeveloperError(
        req,
        res,
        400,
        'WHATSAPP_ACCOUNT_NOT_CONNECTED',
        'No active connected WhatsApp Business Account found for this workspace to execute live flow.'
      );
    }

    await FlowEngine.startFlow(waAccount, normalizedPhone, flow);

    outboundWebhookService
      .dispatchWebhookEvent(req.organization._id, 'flow.triggered', {
        flowId: flow._id,
        flowName: flow.name,
        contactPhone: normalizedPhone
      })
      .catch(() => {});

    return sendDeveloperSuccess(req, res, 200, {
      triggered: true,
      dryRun: false,
      flowId: flow._id,
      flowName: flow.name,
      contactPhone: normalizedPhone
    });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'FLOW_TRIGGER_ERROR', err.message || 'Failed to trigger automation flow.');
  }
};
