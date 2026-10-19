const Joi = require('joi');
const { sendDeveloperError } = require('./requestContext');
const WebhookSubscription = require('../../models/WebhookSubscription');

function validateDeveloperBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return sendDeveloperError(
        req,
        res,
        400,
        'VALIDATION_ERROR',
        error.details.map((d) => d.message).join('; '),
        details
      );
    }
    req.body = value;
    next();
  };
}

const developerSchemas = {
  oauthToken: Joi.object({
    grant_type: Joi.string().valid('client_credentials').required(),
    client_id: Joi.string().trim().min(3).max(128).required(),
    client_secret: Joi.string().min(8).max(256).required(),
    scope: Joi.string().trim().allow('').optional()
  }),

  rotateSecret: Joi.object({
    newSecret: Joi.string().min(16).max(256).required(),
    gracePeriodSeconds: Joi.number().integer().min(0).max(604800).default(3600)
  }),

  revokeToken: Joi.object({
    jti: Joi.string().trim().min(4).max(128).required()
  }),

  createContact: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    phone: Joi.string().trim().min(7).max(20).required(),
    email: Joi.string().email().allow('', null).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    customFields: Joi.object().pattern(Joi.string().max(64), Joi.string().max(500)).optional(),
    optIn: Joi.boolean().default(true),
    source: Joi.string().trim().max(64).default('developer_api')
  }),

  updateContact: Joi.object({
    name: Joi.string().trim().min(1).max(120).optional(),
    phone: Joi.string().trim().min(7).max(20).optional(),
    email: Joi.string().email().allow('', null).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    customFields: Joi.object().pattern(Joi.string().max(64), Joi.string().max(500)).optional(),
    optIn: Joi.boolean().optional(),
    source: Joi.string().trim().max(64).optional()
  }).min(1),

  createDeal: Joi.object({
    contactId: Joi.string().trim().required(),
    title: Joi.string().trim().min(2).max(150).required(),
    amount: Joi.number().min(0).default(0),
    stage: Joi.string()
      .valid('LEAD', 'CONTACTED', 'NEGOTIATION', 'OBJECTION', 'WON', 'LOST')
      .default('LEAD'),
    expectedCloseDate: Joi.date().iso().allow(null).optional(),
    notes: Joi.string().max(2000).allow('', null).optional()
  }),

  updateDeal: Joi.object({
    title: Joi.string().trim().min(2).max(150).optional(),
    amount: Joi.number().min(0).optional(),
    stage: Joi.string()
      .valid('LEAD', 'CONTACTED', 'NEGOTIATION', 'OBJECTION', 'WON', 'LOST')
      .optional(),
    expectedCloseDate: Joi.date().iso().allow(null).optional(),
    notes: Joi.string().max(2000).allow('', null).optional()
  }).min(1),

  invokeAgent: Joi.object({
    message: Joi.string().trim().min(1).max(4000).required(),
    conversationHistory: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant', 'system').required(),
          content: Joi.string().max(4000).required()
        })
      )
      .max(25)
      .default([])
  }),

  triggerFlow: Joi.object({
    contactPhone: Joi.string().trim().min(7).max(20).required(),
    dryRun: Joi.boolean().default(false)
  }),

  createWebhookSubscription: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    targetUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    events: Joi.array()
      .items(Joi.string().valid(...WebhookSubscription.SUPPORTED_WEBHOOK_EVENTS))
      .min(1)
      .unique()
      .required(),
    signingSecret: Joi.string().min(16).max(256).optional(),
    headers: Joi.object().pattern(Joi.string().max(64), Joi.string().max(512)).optional(),
    maxRetries: Joi.number().integer().min(0).max(10).default(3),
    timeoutMs: Joi.number().integer().min(1000).max(30000).default(10000),
    isActive: Joi.boolean().default(true)
  }),

  updateWebhookSubscription: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    targetUrl: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
    events: Joi.array()
      .items(Joi.string().valid(...WebhookSubscription.SUPPORTED_WEBHOOK_EVENTS))
      .min(1)
      .unique()
      .optional(),
    signingSecret: Joi.string().min(16).max(256).optional(),
    headers: Joi.object().pattern(Joi.string().max(64), Joi.string().max(512)).optional(),
    maxRetries: Joi.number().integer().min(0).max(10).optional(),
    timeoutMs: Joi.number().integer().min(1000).max(30000).optional(),
    isActive: Joi.boolean().optional()
  }).min(1)
};

module.exports = {
  validateDeveloperBody,
  developerSchemas
};
