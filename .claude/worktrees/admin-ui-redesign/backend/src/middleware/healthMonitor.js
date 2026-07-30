const { getIO } = require('../utils/socket');
const User = require('../models/User');

const stats = {
  activeUsers: new Set(),
  requests: 0,
  errors: 0,
  latency: {
    whatsapp: [],
    telegram: [],
    instagram: [],
    ai: [],
    auth: []
  },
  recentErrors: []
};

// Reset throughput stats every minute
setInterval(() => {
  stats.requests = 0;
  stats.errors = 0;
  stats.activeUsers.clear();
}, 60000);

const healthMonitor = (req, res, next) => {
  const start = Date.now();
  stats.requests++;
  
  if (req.user) {
    stats.activeUsers.add(req.user._id.toString());
  }

  // Determine service
  let service = 'other';
  if (req.originalUrl.includes('/api/whatsapp')) service = 'whatsapp';
  else if (req.originalUrl.includes('/api/telegram')) service = 'telegram';
  else if (req.originalUrl.includes('/api/instagram')) service = 'instagram';
  else if (req.originalUrl.includes('/api/agents')) service = 'ai';
  else if (req.originalUrl.includes('/api/auth')) service = 'auth';

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (stats.latency[service]) {
      stats.latency[service].push(duration);
      if (stats.latency[service].length > 50) stats.latency[service].shift();
    }

    if (res.statusCode >= 400) {
      stats.errors++;
      const errorData = {
        path: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        timestamp: new Date(),
        user: req.user ? req.user.email : 'Guest'
      };
      
      stats.recentErrors.unshift(errorData);
      if (stats.recentErrors.length > 20) stats.recentErrors.pop();

      // Emit to admins via socket
      try {
        const io = getIO();
        io.to('admin_room').emit('api_error', errorData);
      } catch (err) {
        // Socket might not be ready
      }
    }

    // Periodically emit health update to admins
    if (stats.requests % 10 === 0) {
      try {
        const io = getIO();
        io.to('admin_room').emit('system_health_update', {
          activeUsers: stats.activeUsers.size,
          errorRate: (stats.errors / stats.requests) * 100,
          avgLatency: Object.keys(stats.latency).reduce((acc, key) => {
            const list = stats.latency[key];
            acc[key] = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
            return acc;
          }, {})
        });
      } catch (err) {}
    }
  });

  next();
};

const getStats = () => ({
  activeUsers: stats.activeUsers.size,
  requests: stats.requests,
  errors: stats.errors,
  recentErrors: stats.recentErrors,
  avgLatency: Object.keys(stats.latency).reduce((acc, key) => {
    const list = stats.latency[key];
    acc[key] = list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : 0;
    return acc;
  }, {})
});

module.exports = { healthMonitor, getStats };
