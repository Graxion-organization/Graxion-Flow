const Agent = require('../models/Agent');
const logger = require('../utils/logger');

const WhatsappAccount = require('../models/WhatsappAccount');
const AppError = require('../utils/AppError');
const AIService = require('../services/aiService');
const catchAsync = require('../utils/catchAsync');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

exports.createAgent = async (req, res, next) => {
  try {
    const { whatsappAccountId, ...agentData } = req.body;

    if (agentData.agentType !== 'presenter') {
      // Verify WA account belongs to this organization for social agents
      const waAccount = await WhatsappAccount.findOne({
        _id: whatsappAccountId,
        organization: req.organization._id,
        status: 'connected',
      });
      if (!waAccount) return next(new AppError('WhatsApp account not found or not connected.', 404));
    }

    // Check agent limit (scoped to organization)
    const agentCount = await Agent.countDocuments({ organization: req.organization._id, isActive: true });
    const limits = await req.user.getPlanLimits();
    if (agentCount >= limits.agents) {
      return next(new AppError(`Your plan allows only ${limits.agents} agent(s). Please upgrade.`, 403));
    }

    const agent = await Agent.create({
      ...agentData,
      user: req.user._id,
      organization: req.organization._id,
      whatsappAccount: whatsappAccountId,
    });

    res.status(201).json({ status: 'success', data: { agent } });
  } catch (err) {
    next(err);
  }
};

exports.getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find({ organization: req.organization._id, isActive: true })
      .populate('whatsappAccount', 'displayPhoneNumber verifiedName status')
      .populate('telegramAccount', 'botUsername botName status')
      .populate('instagramAccount', 'igUsername igAccountId status')
      .populate('facebookAccount', 'pageName pageId status')
      .lean();
    res.status(200).json({ status: 'success', results: agents.length, data: { agents } });
  } catch (err) {
    next(err);
  }
};

exports.getAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, organization: req.organization._id })
      .populate('whatsappAccount', 'displayPhoneNumber verifiedName status')
      .populate('telegramAccount', 'botUsername botName status')
      .populate('instagramAccount', 'igUsername igAccountId status')
      .populate('facebookAccount', 'pageName pageId status');
    if (!agent) return next(new AppError('Agent not found.', 404));
    res.status(200).json({ status: 'success', data: { agent } });
  } catch (err) {
    next(err);
  }
};

exports.updateAgent = async (req, res, next) => {
  try {
    const forbidden = ['user', 'organization', 'whatsappAccount', 'stats'];
    forbidden.forEach((f) => delete req.body[f]);

    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!agent) return next(new AppError('Agent not found.', 404));
    res.status(200).json({ status: 'success', data: { agent } });
  } catch (err) {
    next(err);
  }
};

exports.deleteAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { isActive: false },
      { new: true }
    );
    if (!agent) return next(new AppError('Agent not found.', 404));
    res.status(200).json({ status: 'success', message: 'Agent deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.toggleAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!agent) return next(new AppError('Agent not found.', 404));
    agent.isActive = !agent.isActive;
    await agent.save();
    res.status(200).json({ status: 'success', data: { agent } });
  } catch (err) {
    next(err);
  }
};

// Test agent with a sample message
exports.testAgent = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return next(new AppError('Test message is required.', 400));

    const agent = await Agent.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!agent) return next(new AppError('Agent not found.', 404));

    const result = await AIService.generate(agent, [], message);
    res.status(200).json({
      status: 'success',
      data: {
        response: result.content,
        tokensUsed: result.tokensUsed,
        responseTime: result.responseTime,
        model: result.model,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAvailableModels = (req, res) => {
  res.status(200).json({ status: 'success', data: AIService.getAvailableModels() });
};

exports.uploadKnowledgeBase = async (req, res, next) => {
  try {
    const { textPrompt } = req.body;

    if (!req.file && !textPrompt) {
      return next(new AppError('No file or text prompt provided', 400));
    }

    const agent = await Agent.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!agent) {
      return next(new AppError('Agent not found', 404));
    }

    let newKbEntry = {};

    if (req.file) {
      let fileType = 'document';
      let extractedText = '';

      if (req.file.mimetype.includes('pdf')) {
        fileType = 'pdf';
        try {
          // Read the file and extract text using pdf-parse
          let fileBuffer;
          if (req.file.path) {
            // Disk storage: read from path
            fileBuffer = await fs.readFile(req.file.path);
          } else if (req.file.buffer) {
            // Memory storage: use buffer directly
            fileBuffer = req.file.buffer;
          }

          if (fileBuffer) {
            const pdfData = await pdfParse(fileBuffer);
            extractedText = pdfData.text || '';
            logger.info(`[PDF Parse] Extracted ${extractedText.length} characters from PDF: ${req.file.originalname}`);
          }
        } catch (pdfErr) {
          logger.error('[PDF Parse] Failed to extract text from PDF:', pdfErr.message);
          // Continue without text — file URL is still stored
        }
      } else if (req.file.mimetype.includes('video')) {
        fileType = 'video';
      } else if (req.file.mimetype.includes('image')) {
        fileType = 'image';
      }

      newKbEntry = {
        fileUrl: req.file.path || req.file.filename || req.file.originalname,
        fileName: req.file.originalname,
        fileType,
        textData: extractedText // Store extracted text for AI use
      };
    } else if (textPrompt) {
      newKbEntry = {
        fileUrl: 'text-prompt',
        fileName: 'Text Prompt',
        textData: textPrompt,
        fileType: 'text'
      };
    }

    if (!agent.knowledgeBase) agent.knowledgeBase = [];
    agent.knowledgeBase.push(newKbEntry);
    await agent.save();

    res.status(200).json({
      status: 'success',
      message: 'Knowledge base updated successfully',
      data: { knowledgeBase: agent.knowledgeBase }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a specific knowledge base entry from an agent
 */
exports.deleteKnowledgeBaseEntry = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!agent) return next(new AppError('Agent not found', 404));

    const entryIndex = parseInt(req.params.entryIndex);
    if (isNaN(entryIndex) || entryIndex < 0 || entryIndex >= (agent.knowledgeBase || []).length) {
      return next(new AppError('Invalid knowledge base entry index', 400));
    }

    agent.knowledgeBase.splice(entryIndex, 1);
    await agent.save();

    res.status(200).json({
      status: 'success',
      message: 'Knowledge base entry deleted',
      data: { knowledgeBase: agent.knowledgeBase }
    });
  } catch (err) {
    next(err);
  }
};

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
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});
