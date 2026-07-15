const winston = require('winston');
const path = require('path');

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

// Custom format to mask sensitive data like access_token, api_key, etc.
const maskSensitive = winston.format((info) => {
  const sensitiveKeys = ['access_token', 'accessToken', 'api_key', 'apiKey', 'api_secret', 'apiSecret', 'secret', 'password', 'token', 'botToken'];
  
  if (info.metadata) {
    info.metadata = circularSafeClone(info.metadata);
  }

  const mask = (obj) => {
    for (let key in obj) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        mask(obj[key]);
      }
    }
  };

  // Clone to avoid mutating the original object if it's reused
  if (typeof info.message === 'string') {
    sensitiveKeys.forEach(key => {
      const regex = new RegExp(`(${key}=|"${key}":\\s*")[^"&\\s]+`, 'gi');
      info.message = info.message.replace(regex, `$1***REDACTED***`);
    });
  }
  
  if (info.metadata) mask(info.metadata);
  
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

module.exports = logger;
