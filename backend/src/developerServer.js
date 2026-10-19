require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const developerV1Router = require('./developer/routes/v1');

const developerApp = express();

// Connect shared MongoDB database when running as standalone service
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

developerApp.set('trust proxy', 1);
developerApp.use(compression());
developerApp.use(helmet());
developerApp.use(express.json({ limit: '512kb' }));
developerApp.use(express.urlencoded({ extended: true, limit: '512kb' }));
developerApp.use(mongoSanitize());
developerApp.use(require('./middleware/xss')());
developerApp.use(hpp());

// Mount Developer API v1
developerApp.use('/api/developer/v1', developerV1Router);

// Standalone health alias
developerApp.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'graxion-developer-api-standalone',
    timestamp: new Date().toISOString()
  });
});

// Fallback 404
developerApp.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.originalUrl} not found on Graxion Developer API server.`
    }
  });
});

if (require.main === module) {
  const PORT = process.env.DEVELOPER_API_PORT || 5001;
  const server = developerApp.listen(PORT, () => {
    logger.info(`Graxion Developer API standalone server running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received on Developer API server. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

module.exports = developerApp;
