const Template = require('../models/Template');
const WhatsappAccount = require('../models/WhatsappAccount');
const WhatsAppService = require('../services/whatsappService');
const systemTemplates = require('../utils/systemTemplates');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { decrypt } = require('../utils/encryption');

// Helper to get connected WhatsApp account with decrypted token
const getConnectedWAAccount = async (userId) => {
  const waAccount = await WhatsappAccount.findOne({ user: userId, status: 'connected' }).select('+accessToken');
  if (!waAccount) {
    throw new AppError('No connected WhatsApp Business Account found. Please connect your WhatsApp account in Integrations first.', 400);
  }
  if (!waAccount.wabaId) {
    throw new AppError('WhatsApp Business Account ID (WABA ID) missing on this account.', 400);
  }
  return waAccount;
};

// Fallback sample values for Meta template variable verification
const sampleVarValues = ['John', '20', 'SAVE20', 'Today', 'Sample', 'Order123', 'VIP', 'Product'];

// Helper to sanitize components for Meta Graph API rules & attach required variable examples
const sanitizeMetaComponents = (components) => {
  if (!Array.isArray(components)) return [];
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F191}-\u{1F251}]/gu;

  return components.map(c => {
    // 1. Sanitize TEXT HEADER
    if (c.type === 'HEADER' && c.format === 'TEXT' && c.text) {
      const cleanHeader = c.text
        .replace(emojiRegex, '')
        .replace(/[*_~\n\r'"]/g, '')
        .trim();
      return {
        ...c,
        text: cleanHeader || 'Announcement'
      };
    }

    // 2. Sanitize & attach Meta required example.body_text for variables
    if (c.type === 'BODY' && c.text) {
      const matches = c.text.match(/\{\{(\d+)\}\}/g) || [];
      const varCount = matches.length;

      const bodyComp = { ...c };

      if (varCount > 0) {
        const sampleRow = [];
        for (let i = 0; i < varCount; i++) {
          sampleRow.push(sampleVarValues[i] || `Sample${i + 1}`);
        }
        bodyComp.example = {
          body_text: [sampleRow]
        };
      }
      return bodyComp;
    }

    // 3. Sanitize BUTTONS text
    if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
      return {
        ...c,
        buttons: c.buttons.map(b => ({
          ...b,
          text: b.text
            ? b.text
                .replace(emojiRegex, '')
                .replace(/[*_~\n\r'"]/g, '')
                .trim() || 'Action'
            : 'Action'
        }))
      };
    }

    return c;
  });
};

// GET /api/templates/system - Get pre-approved ready-to-use system template library
exports.getSystemTemplates = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { templates: systemTemplates }
  });
});

// GET /api/templates - Get user's synced & created templates
exports.getAllTemplates = catchAsync(async (req, res, next) => {
  const templates = await Template.find({ organization: req.user.currentOrganization || req.user.organization })
    .sort('-createdAt');

  res.status(200).json({ status: 'success', data: { templates } });
});

// POST /api/templates/sync - Sync latest status & templates from Meta Graph API
exports.syncTemplatesFromMeta = catchAsync(async (req, res, next) => {
  const waAccount = await getConnectedWAAccount(req.user.id);
  const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
  
  const metaResponse = await waService.getMessageTemplates(waAccount.wabaId);
  const metaTemplates = metaResponse.data || [];

  const orgId = req.user.currentOrganization || req.user.organization;

  const upsertPromises = metaTemplates.map(tpl => {
    return Template.findOneAndUpdate(
      { name: tpl.name, language: tpl.language, organization: orgId },
      {
        name: tpl.name,
        category: tpl.category,
        language: tpl.language,
        components: tpl.components,
        status: tpl.status,
        rejectedReason: tpl.rejected_reason || tpl.reason || null,
        wabaId: waAccount.wabaId,
        metaTemplateId: tpl.id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  await Promise.all(upsertPromises);

  res.status(200).json({
    status: 'success',
    message: `Successfully synced ${metaTemplates.length} templates from Meta Graph API.`,
    count: metaTemplates.length
  });
});

// POST /api/templates - Create custom template and submit directly to Meta Graph API
exports.createTemplate = catchAsync(async (req, res, next) => {
  const { name, category, language, components } = req.body;

  if (!name || !category || !components || !Array.isArray(components)) {
    return next(new AppError('Name, category, and valid components array are required.', 400));
  }

  // Format and validate template name according to Meta rules (lowercase and underscores only)
  const sanitizedName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  if (sanitizedName.length < 2 || sanitizedName.length > 512) {
    return next(new AppError('Template name must be between 2 and 512 characters and contain only lowercase letters, numbers, and underscores.', 400));
  }

  if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
    return next(new AppError('Invalid category. Must be MARKETING, UTILITY, or AUTHENTICATION', 400));
  }

  const cleanedComponents = sanitizeMetaComponents(components);

  const waAccount = await getConnectedWAAccount(req.user.id);
  const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

  const metaPayload = {
    name: sanitizedName,
    category,
    language: language || 'en_US',
    components: cleanedComponents
  };

  // Submit directly to Meta Graph API
  const metaResult = await waService.createMessageTemplate(waAccount.wabaId, metaPayload);

  const orgId = req.user.currentOrganization || req.user.organization;

  // Save / Upsert in MongoDB
  const template = await Template.findOneAndUpdate(
    { name: sanitizedName, language: metaPayload.language, organization: orgId },
    {
      organization: orgId,
      name: sanitizedName,
      category,
      language: metaPayload.language,
      components: cleanedComponents,
      status: metaResult.status || 'PENDING',
      wabaId: waAccount.wabaId,
      metaTemplateId: metaResult.id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    status: 'success',
    message: 'Template submitted successfully to Meta for review.',
    data: { template }
  });
});

// POST /api/templates/clone-system - 1-Click Clone system template to user's Meta WABA
exports.cloneSystemTemplate = catchAsync(async (req, res, next) => {
  const { systemTemplateId, customName } = req.body;

  const sysTpl = systemTemplates.find(t => t.id === systemTemplateId);
  if (!sysTpl) {
    return next(new AppError('System template not found.', 404));
  }

  const baseName = customName || sysTpl.id.replace('sys_', '');
  const uniqueSuffix = Date.now().toString(36).slice(-4);
  const sanitizedName = `tpl_${baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${uniqueSuffix}`.slice(0, 64);

  const cleanedComponents = sanitizeMetaComponents(sysTpl.components);

  const waAccount = await getConnectedWAAccount(req.user.id);
  const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);

  const metaPayload = {
    name: sanitizedName,
    category: sysTpl.category,
    language: sysTpl.language,
    components: cleanedComponents
  };

  // Submit to Meta Graph API
  const metaResult = await waService.createMessageTemplate(waAccount.wabaId, metaPayload);

  const orgId = req.user.currentOrganization || req.user.organization;

  const template = await Template.create({
    organization: orgId,
    name: sanitizedName,
    category: sysTpl.category,
    language: sysTpl.language,
    components: cleanedComponents,
    status: metaResult.status || 'PENDING',
    wabaId: waAccount.wabaId,
    metaTemplateId: metaResult.id
  });

  res.status(201).json({
    status: 'success',
    message: `Template "${sysTpl.title}" cloned and submitted to Meta for review.`,
    data: { template }
  });
});

// DELETE /api/templates/:id - Delete template on Meta Graph API and MongoDB
exports.deleteTemplate = catchAsync(async (req, res, next) => {
  const orgId = req.user.currentOrganization || req.user.organization;
  const template = await Template.findOne({ _id: req.params.id, organization: orgId });

  if (!template) {
    return next(new AppError('Template not found', 404));
  }

  // Attempt deleting on Meta Graph API if connected
  try {
    const waAccount = await getConnectedWAAccount(req.user.id);
    const waService = new WhatsAppService(decrypt(waAccount.accessToken), waAccount.phoneNumberId);
    await waService.deleteMessageTemplate(waAccount.wabaId, template.name);
  } catch (err) {
    // If Meta delete fails (e.g. account disconnected or already deleted on Meta), proceed with local DB cleanup
  }

  await Template.findByIdAndDelete(template._id);

  res.status(204).json({ status: 'success', data: null });
});