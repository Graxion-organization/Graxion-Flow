const Joi = require('joi');
const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return next(new AppError(message, 400));
  }
  next();
};

// IND-003: Indian Phone Number format (+91 followed by 10 digits starting with 6-9)
const indianPhoneRegex = /^(?:\+91)[6789]\d{9}$/;

const schemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),

  createAgent: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().max(200).optional(),
    agentType: Joi.string().valid('social', 'presenter').default('social'),
    whatsappAccountId: Joi.string().when('agentType', { is: 'presenter', then: Joi.optional(), otherwise: Joi.required() }),
    platform: Joi.string().optional(),
    elevenLabsVoiceId: Joi.string().optional(),
    aiProvider: Joi.string().valid('openai', 'anthropic').default('openai'),
    model: Joi.string().optional(),
    systemPrompt: Joi.string().min(10).max(4000).required(),
    temperature: Joi.number().min(0).max(2).default(0.7),
    maxTokens: Joi.number().min(50).max(2000).default(500),
    responseLanguage: Joi.string().default('auto'),
    fallbackMessage: Joi.string().max(500).optional(),
    humanHandoffKeywords: Joi.array().items(Joi.string()).optional(),
    greetingMessage: Joi.string().max(1000).optional(),
    contextWindow: Joi.number().min(1).max(50).default(10),
    businessHours: Joi.object().optional(),
  }),

  connectWhatsapp: Joi.object({
    phoneNumberId: Joi.string().required(),
    wabaId: Joi.string().required(),
    accessToken: Joi.string().required(),
    displayPhoneNumber: Joi.string().pattern(indianPhoneRegex).message('Phone number must be a valid Indian format (+91XXXXXXXXXX)').required(),
    verifiedName: Joi.string().optional(),
  }),

  createOrder: Joi.object({
    plan: Joi.string().valid('starter', 'pro', 'enterprise').required(),
  }),

  verifyPayment: Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required(),
    plan: Joi.string().valid('starter', 'pro', 'enterprise').required(),
  }),
};

module.exports = { validate, schemas };
