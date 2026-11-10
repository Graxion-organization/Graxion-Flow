const winston = require('winston');
const path = require('path');
const mongoose = require('mongoose');
const SystemErrorLog = require('../models/SystemErrorLog');

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'white' };
winston.addColors(colors);

// Helper to safely clone objects with circular references (e.g. Axios/HTTP errors)
const circularSafeClone = (obj, seen = new WeakSet()) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (seen.has(obj)) {
    return '[Circular]';
  }
  
  if (Buffer.isBuffer(obj)) {
    return `[Buffer: ${obj.length} bytes]`;
  }
  
  if (ArrayBuffer.isView(obj)) {
    return `[TypedArray: ${obj.constructor.name || 'View'} of size ${obj.byteLength} bytes]`;
  }

  if (
    obj._bsontype === 'ObjectId' ||
    obj._bsontype === 'ObjectID' ||
    typeof obj.toHexString === 'function' ||
    (mongoose?.Types?.ObjectId && obj instanceof mongoose.Types.ObjectId)
  ) {
    return obj.toString();
  }

  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj);
  
  seen.add(obj);
  
  const clone = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
          clone[key] = circularSafeClone(val, seen);
        } else {
          clone[key] = val;
        }
      } catch (err) {
        clone[key] = `[Error cloning: ${err.message}]`;
      }
    }
  }
  
  seen.delete(obj);
  return clone;
};

// Sensitive key patterns that must never be persisted or displayed
const SENSITIVE_KEY_PATTERNS = [
  'access_token',
  'accesstoken',
  'pageaccesstoken',
  'waaccesstoken',
  'refresh_token',
  'refreshtoken',
  'id_token',
  'api_key',
  'apikey',
  'x-api-key',
  'api_secret',
  'apisecret',
  'client_secret',
  'clientsecret',
  'app_secret',
  'appsecret',
  'secret',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'bottoken',
  'bot_token',
  'authorization',
  'cookie',
  'set-cookie',
  'masterkey',
  'private_key',
  'privatekey',
  'x-developer-client-secret',
  'x-graxion-proxy-secret',
  'x-hub-signature-256',
];

const isSensitiveKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  const lower = key.toLowerCase();
  // Allow non-sensitive token count fields like tokensUsed, totalTokensUsed, tokens, maxTokens, max_tokens
  if (['tokens', 'tokensused', 'totaltokensused', 'maxtokens', 'max_tokens', 'inputtokens', 'outputtokens'].includes(lower)) {
    return false;
  }
  return SENSITIVE_KEY_PATTERNS.some((sk) => lower.includes(sk));
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  let cleaned = str;
  // Redact Bearer tokens
  cleaned = cleaned.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***REDACTED***');
  // Redact Basic auth or URL credentials (redis://, rediss://, mongodb://, mongodb+srv://, http://, https://)
  cleaned = cleaned.replace(/((?:rediss?|mongodb(?:\+srv)?|https?):\/\/)([^/\s:@]+:[^/\s@]+|[^/\s@]+)@/gi, '$1***REDACTED***@');
  // Redact Telegram bot token in URLs
  cleaned = cleaned.replace(/(https?:\/\/api\.telegram\.org\/bot)[^/\s]+/gi, '$1***REDACTED***');
  // Redact common API key prefixes (OpenAI sk-, Google AIza, Meta EAA)
  cleaned = cleaned.replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '***REDACTED***');
  cleaned = cleaned.replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '***REDACTED***');
  cleaned = cleaned.replace(/\bEAA[A-Za-z0-9]{16,}\b/g, '***REDACTED***');
  // Redact query/JSON key-value pairs for sensitive keys
  SENSITIVE_KEY_PATTERNS.forEach((key) => {
    const queryRegex = new RegExp(`([?&]${key}=)[^&#\\s"']+`, 'gi');
    cleaned = cleaned.replace(queryRegex, '$1***REDACTED***');
    const kvRegex = new RegExp(`(${key}\\s*[:=]\\s*["']?)[^"&'\\s,}]+`, 'gi');
    cleaned = cleaned.replace(kvRegex, '$1***REDACTED***');
  });
  return cleaned;
};

const sanitizeEndpoint = (endpoint) => {
  if (!endpoint || typeof endpoint !== 'string') return endpoint;
  return sanitizeString(endpoint);
};

const sanitizeLogData = (input, seen = new WeakSet(), depth = 0) => {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return sanitizeString(input);
  if (typeof input !== 'object') return input;
  if (depth > 6) return '[MaxDepth]';

  const cloned = circularSafeClone(input, seen);
  if (cloned === null || typeof cloned !== 'object') {
    return typeof cloned === 'string' ? sanitizeString(cloned) : cloned;
  }

  const walk = (obj, d = 0) => {
    if (!obj || typeof obj !== 'object' || d > 6) return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') obj[i] = sanitizeString(obj[i]);
        else if (typeof obj[i] === 'object' && obj[i] !== null) walk(obj[i], d + 1);
      }
      return obj;
    }
    for (const key of Object.keys(obj)) {
      if (isSensitiveKey(key)) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        walk(obj[key], d + 1);
      }
    }
    return obj;
  };

  return walk(cloned, depth);
};

// Custom format to mask sensitive data like access_token, api_key, etc.
const maskSensitive = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = sanitizeString(info.message);
  }
  if (info.metadata) {
    info.metadata = sanitizeLogData(info.metadata);
  }
  return info;
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  maskSensitive(),
  winston.format.printf((info) => {
    const meta = Object.keys(info.metadata).length ? `\n${JSON.stringify(info.metadata, null, 2)}` : '';
    return `${info.timestamp} ${info.level}: ${info.message}${meta}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  maskSensitive(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    )
  }),
  new winston.transports.File({ 
    filename: path.join('logs', 'error.log'), 
    level: 'error',
    format: fileFormat
  }),
  new winston.transports.File({ 
    filename: path.join('logs', 'publish.log'),
    format: fileFormat
  }),
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports,
});

// Infer service and provider from message and metadata when not explicitly provided
const inferServiceAndProvider = (msgStr, meta = {}) => {
  const lower = (msgStr || '').toLowerCase();
  let service = meta.service || meta.module || null;
  let provider = meta.provider || meta.integration || meta.platform || null;

  if (!service) {
    if (lower.includes('whatsapp') || lower.includes('meta_send') || lower.includes('meta_status')) {
      service = 'whatsapp';
      provider = provider || 'meta';
    } else if (lower.includes('instagram')) {
      service = 'instagram';
      provider = provider || 'meta';
    } else if (lower.includes('telegram')) {
      service = 'telegram';
      provider = provider || 'telegram';
    } else if (lower.includes('ai_') || lower.includes('ai ') || lower.includes('openai') || lower.includes('gemini') || lower.includes('anthropic') || lower.includes('openrouter') || lower.includes('orchestration')) {
      service = 'ai';
      if (lower.includes('openai')) provider = provider || 'openai';
      else if (lower.includes('gemini')) provider = provider || 'gemini';
      else if (lower.includes('anthropic')) provider = provider || 'anthropic';
      else if (lower.includes('openrouter')) provider = provider || 'openrouter';
      else provider = provider || 'ai';
    } else if (lower.includes('bullmq') || lower.includes('queue') || lower.includes('worker')) {
      service = 'bullmq';
      provider = provider || 'redis';
    } else if (lower.includes('redis')) {
      service = 'redis';
      provider = provider || 'redis';
    } else if (lower.includes('mongo') || lower.includes('database') || lower.includes('cast to objectid') || lower.includes('validationerror')) {
      service = 'mongodb';
      provider = provider || 'mongodb';
    } else if (lower.includes('socket')) {
      service = 'socket';
      provider = provider || 'socket.io';
    } else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('csrf') || lower.includes('login')) {
      service = 'auth';
      provider = provider || 'internal';
    } else if (lower.includes('webhook')) {
      service = 'webhook';
      provider = provider || 'meta';
    } else if (lower.includes('cloudinary') || lower.includes('upload') || lower.includes('media')) {
      service = 'storage';
      provider = provider || 'cloudinary';
    } else if (lower.includes('email') || lower.includes('smtp') || lower.includes('nodemailer')) {
      service = 'email';
      provider = provider || 'smtp';
    } else {
      service = 'internal';
      provider = provider || 'internal';
    }
  }

  return {
    service: meta.service ? String(meta.service) : String(service).toLowerCase(),
    provider: meta.provider ? String(meta.provider) : String(provider || service || 'internal').toLowerCase(),
  };
};

// Persist structured error log to SystemErrorLog in MongoDB
const persistAdminErrorLog = (message, metadata = {}, defaultSeverity = 'ERROR') => {
  try {
    const isMocked = Boolean(
      SystemErrorLog?.findOneAndUpdate &&
      (SystemErrorLog.findOneAndUpdate._isMockFunction || typeof SystemErrorLog.findOneAndUpdate.mock === 'object')
    );
    const isDbConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);

    if (!isDbConnected && !isMocked) {
      return null;
    }

    let parsedMessage = message;
    let stack = null;
    let rawMeta = {};

    if (message instanceof Error) {
      parsedMessage = message.message;
      stack = message.stack;
      rawMeta = typeof metadata === 'object' && metadata !== null ? { ...metadata } : {};
    } else if (typeof message === 'object' && message !== null) {
      parsedMessage = message.message || JSON.stringify(sanitizeLogData(message));
      stack = message.stack || null;
      rawMeta = { ...message, ...(typeof metadata === 'object' && metadata !== null ? metadata : {}) };
    } else {
      parsedMessage = String(message || 'Unknown error');
      if (metadata instanceof Error) {
        stack = metadata.stack;
        rawMeta = {
          errorName: metadata.name,
          errorMessage: metadata.message,
          errorCode: metadata.code || metadata.response?.data?.error?.code,
          statusCode: metadata.statusCode || metadata.status || metadata.response?.status,
          endpoint: metadata.config?.url,
          responseBody: metadata.response?.data,
        };
      } else if (typeof metadata === 'object' && metadata !== null) {
        rawMeta = { ...metadata };
        stack = metadata.stack || metadata.error?.stack || null;
      } else if (metadata !== undefined) {
        rawMeta = { detail: metadata };
      }
    }

    parsedMessage = sanitizeString(parsedMessage);
    if (stack) stack = sanitizeString(stack);

    const { service, provider } = inferServiceAndProvider(parsedMessage, rawMeta);

    const statusCode = Number(
      rawMeta.statusCode ||
      rawMeta.status ||
      rawMeta.httpStatus ||
      rawMeta.response?.status ||
      0
    ) || undefined;

    const rawErrorCode =
      rawMeta.errorCode ??
      rawMeta.code ??
      rawMeta.reason ??
      rawMeta.error?.code ??
      rawMeta.response?.data?.error?.code;
    const errorCode = rawErrorCode !== undefined && rawErrorCode !== null ? String(rawErrorCode) : undefined;

    const rawEndpoint = rawMeta.endpoint || rawMeta.url || rawMeta.originalUrl || rawMeta.config?.url;
    const endpoint = rawEndpoint ? sanitizeEndpoint(String(rawEndpoint)) : undefined;

    const requestId = rawMeta.requestId || rawMeta.correlationId ? String(rawMeta.requestId || rawMeta.correlationId) : undefined;
    const workspaceId = (rawMeta.workspaceId || rawMeta.organizationId || rawMeta.organization)
      ? String(rawMeta.workspaceId || rawMeta.organizationId || rawMeta.organization)
      : undefined;
    const userId = rawMeta.userId || rawMeta.user ? String(rawMeta.userId || rawMeta.user) : undefined;
    const conversationId = rawMeta.conversationId ? String(rawMeta.conversationId) : undefined;
    const messageId = (rawMeta.messageId || rawMeta.waMessageId || rawMeta.metaMessageId)
      ? String(rawMeta.messageId || rawMeta.waMessageId || rawMeta.metaMessageId)
      : undefined;
    const queueName = rawMeta.queueName || rawMeta.queue ? String(rawMeta.queueName || rawMeta.queue) : undefined;
    const jobId = rawMeta.jobId ? String(rawMeta.jobId) : undefined;
    const retryAttempt = rawMeta.retryAttempt !== undefined ? Number(rawMeta.retryAttempt) : (rawMeta.attempt !== undefined ? Number(rawMeta.attempt) : undefined);
    const stage = rawMeta.stage ? String(rawMeta.stage) : undefined;

    const rawResponseBody = rawMeta.responseBody || rawMeta.response?.data || rawMeta.errorData;
    const responseBody = rawResponseBody ? sanitizeLogData(rawResponseBody) : undefined;

    const sanitizedContext = sanitizeLogData(rawMeta);
    const severity = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(String(rawMeta.severity || '').toUpperCase())
      ? String(rawMeta.severity).toUpperCase()
      : defaultSeverity;
    const level = severity === 'CRITICAL' ? 'critical' : severity === 'WARNING' ? 'warn' : severity === 'INFO' ? 'info' : 'error';

    const updateFields = {
      message: parsedMessage,
      severity,
      level,
      service,
      provider,
      context: sanitizedContext,
      lastOccurredAt: new Date(),
    };

    if (stack) updateFields.stack = stack;
    if (errorCode) updateFields.errorCode = errorCode;
    if (statusCode) updateFields.statusCode = statusCode;
    if (endpoint) updateFields.endpoint = endpoint;
    if (requestId) updateFields.requestId = requestId;
    if (workspaceId) updateFields.workspaceId = workspaceId;
    if (userId) updateFields.userId = userId;
    if (conversationId) updateFields.conversationId = conversationId;
    if (messageId) updateFields.messageId = messageId;
    if (queueName) updateFields.queueName = queueName;
    if (jobId) updateFields.jobId = jobId;
    if (retryAttempt !== undefined && !isNaN(retryAttempt)) updateFields.retryAttempt = retryAttempt;
    if (stage) updateFields.stage = stage;
    if (responseBody !== undefined) updateFields.responseBody = responseBody;

    const filter = { message: parsedMessage, resolved: false };

    const op = SystemErrorLog.findOneAndUpdate(
      filter,
      {
        $inc: { count: 1 },
        $set: updateFields,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (op && typeof op.catch === 'function') {
      op.catch((err) => {
        console.error('[DB Logger] Failed to write error log to DB:', err.message);
      });
    }
    return op;
  } catch (err) {
    console.error('[DB Logger] Exception during error DB write:', err.message);
    return null;
  }
};

// Intercept logger.error to save to DB asynchronously
const originalError = logger.error;
logger.error = function (message, metadata = {}) {
  originalError.call(logger, message, metadata);
  persistAdminErrorLog(message, metadata, 'ERROR');
};

logger.critical = function (message, metadata = {}) {
  originalError.call(logger, message, { ...metadata, severity: 'CRITICAL' });
  persistAdminErrorLog(message, { ...metadata, severity: 'CRITICAL' }, 'CRITICAL');
};

logger.recordAdminLog = persistAdminErrorLog;
logger.sanitizeLogData = sanitizeLogData;
logger.sanitizeString = sanitizeString;
logger.sanitizeEndpoint = sanitizeEndpoint;

module.exports = logger;

