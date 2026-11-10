const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists. Please use another value.`, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data: ${errors.join('. ')}`, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
  } else {
    logger.error('UNEXPECTED ERROR:', err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress;
  const userId = req.user ? req.user._id.toString() : 'unauthenticated';
  const workspaceId = (req.organization?._id || req.headers?.['x-organization-id'] || req.user?.currentOrganization || '')?.toString() || undefined;
  const requestId = req.headers?.['x-request-id'] || req.id || undefined;
  const endpoint = logger.sanitizeEndpoint ? logger.sanitizeEndpoint(req.originalUrl) : req.originalUrl;

  const isRoutineUnauthOrNotFound =
    (err.statusCode === 401 && userId === 'unauthenticated') ||
    (err.statusCode === 404 && !err.service && !err.provider);

  const logMethod = isRoutineUnauthOrNotFound ? logger.warn.bind(logger) : logger.error.bind(logger);

  logMethod(`${err.statusCode} - ${err.message} - ${endpoint}`, {
    ip,
    userId,
    workspaceId,
    requestId,
    endpoint,
    statusCode: err.statusCode,
    errorCode: err.code || err.name || `HTTP_${err.statusCode}`,
    service: err.service || 'api',
    provider: err.provider || 'internal',
    severity: err.statusCode >= 500 ? 'ERROR' : 'WARNING',
    stack: err.stack,
    responseBody: err.response?.data,
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message };
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    sendErrorProd(error, res);
  }
};

