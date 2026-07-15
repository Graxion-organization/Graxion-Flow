require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { validateCsrf } = require('./middleware/csrf');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');

// Routes
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const agentRoutes = require('./routes/agents');
const conversationRoutes = require('./routes/conversations');
const billingRoutes = require('./routes/billing');
const telegramRoutes = require('./routes/telegramRoutes');
const telegramWebhookRoutes = require('./routes/telegramWebhookRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const instagramWebhookRoutes = require('./routes/instagramWebhookRoutes');
const facebookRoutes = require('./routes/facebookRoutes');
const facebookWebhookRoutes = require('./routes/facebookWebhookRoutes');
const socialHubRoutes = require('./routes/socialHub');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const fraudAdminRoutes = require('./routes/fraudAdmin');
const featureFlagsRoutes = require('./routes/featureFlags');
const organizationRoutes = require('./routes/organizationRoutes');

const contactRoutes = require('./routes/contacts');
const contactGroupRoutes = require('./routes/contactGroups');
const optOutRoutes = require('./routes/optOuts');
const templateRoutes = require('./routes/templates');
const broadcastRoutes = require('./routes/broadcasts');
const campaignRoutes = require('./routes/campaigns');
const keywordRoutes = require('./routes/keywords');
const flowRoutes = require('./routes/flows');
const analyticsRoutes = require('./routes/analytics');

const meetingRoutes = require('./routes/meetings');
const sessionRoutes = require('./routes/sessions');
const materialRoutes = require('./routes/materials');
const courseRoutes = require('./routes/courses');
const batchRoutes = require('./routes/batches');

const { checkMaintenance } = require('./middleware/maintenance');
const { healthMonitor } = require('./middleware/healthMonitor');

const app = express();

// ─── Connect DB ───────────────────────────────────────────
connectDB();

// ─── Initialize Crons ─────────────────────────────────────
require('./cron');

app.set('trust proxy', 1);
// ─── Security & Optimization Middleware ───────────────────
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://automation.poojatrendhub.com'
    ];
    
    // Only allow undefined origin in development or for specific allowed origins
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some(ao => ao && ao === origin) || 
                      (process.env.NODE_ENV !== 'production' && origin && origin.endsWith('.vercel.app'));

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
};

// Apply CORS conditionally (skip for webhooks which don't send Origin)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) {
    return next();
  }
  cors(corsOptions)(req, res, next);
});

// Rate limiting - global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { status: 'error', message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl && req.originalUrl.includes('/webhook'),
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many auth attempts. Please try after 15 minutes.' },
});

// Limiter for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many admin requests. Please try again later.' },
});
 
app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/admin', adminLimiter);

const fileUpload = require('express-fileupload');
const os = require('os');

// Body parsers
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// File upload middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}));

const path = require('path');
// Serve static files for things like bot-sdk.html
app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieParser()); // Required for reading jwt and csrf cookies
app.use(validateCsrf); // Apply CSRF validation globally

app.use(mongoSanitize()); // NoSQL injection
app.use(require('./middleware/xss')()); // XSS protection
app.use(hpp()); // HTTP Parameter Pollution

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Custom request logger for system logs (captures IP and User ID)
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  res.on('finish', () => {
    // Skip noisy logs like health checks
    if (req.originalUrl === '/health') return;
    
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      ip,
      userId: req.user ? req.user._id : 'unauthenticated',
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// ─── Root Route ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Welcome to the WhatsApp AI Agent SaaS API',
    timestamp: new Date().toISOString(),
  });
});

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use(healthMonitor);
app.use(checkMaintenance);

// Redirect YouTube OAuth callback to frontend
app.get('/youtube-callback', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const query = new URLSearchParams(req.query).toString();
  res.redirect(`${frontendUrl}/youtube-callback?${query}`);
});

const { webhookIpLimiter } = require('./middleware/webhookRateLimit');

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', webhookIpLimiter, whatsappRoutes); // Includes webhook endpoints
app.use('/api/telegram/webhook', webhookIpLimiter, telegramWebhookRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/instagram/webhook', webhookIpLimiter, instagramWebhookRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/facebook/webhook', webhookIpLimiter, facebookWebhookRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/youtube', require('./routes/youtubeRoutes'));
app.use('/api/social-hub', socialHubRoutes);
app.use('/api/marketing-copilot', require('./routes/marketingCopilot'));
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fraud-admin', fraudAdminRoutes);
app.use('/api/organizations', organizationRoutes);

app.use('/api/contacts', contactRoutes);
app.use('/api/contact-groups', contactGroupRoutes);
app.use('/api/opt-outs', optOutRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/analytics', analyticsRoutes);
// app.use('/api/prompts', require('./routes/prompts')); // TODO: Route file does not exist yet

app.use('/api/feature-flags', featureFlagsRoutes);

app.use('/api/meetings', meetingRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);

// ─── 404 Handler ─────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// ─── Global Error Handler ─────────────────────────────────
app.use(errorHandler);

const { initSocket } = require('./utils/socket');
const { startSocialPostScheduler } = require('./services/socialPostScheduler');
const { startDeletionScheduler } = require('./services/dataDeletionService');
const { startInstagramWorker } = require('./jobs/instagramWorker');

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Initialize Socket.io
initSocket(server);
const { getIO } = require('./utils/socket');
const { initializeClassNamespace } = require('./sockets/classNamespace');
initializeClassNamespace(getIO());

startSocialPostScheduler();
startDeletionScheduler();
startInstagramWorker();

// Start Meeting auto-scheduler
const { startAutoScheduler } = require('./services/schedulerService');
startAutoScheduler();

// Zoom Headless Bot Worker removed during Phase 13 cleanup
// require('../workers/zoom-bot/index.js');

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  // In production, we should exit and let the process manager (PM2/Render) restart it
  if (process.env.NODE_ENV === 'production') {
    server.close(() => process.exit(1));
  }
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => logger.info('Process terminated.'));
});

module.exports = app;
