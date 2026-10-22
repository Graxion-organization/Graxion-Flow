const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, origin || '*');
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // High-Performance Socket Adapter (Native In-Memory by default for zero-latency instant inbox updates)
  try {
    const { redis, isRedisReady, redisConfig } = require('../config/redis');
    const enableRedisCluster = process.env.ENABLE_REDIS_SOCKET_ADAPTER === 'true';

    if (enableRedisCluster && isRedisReady() && typeof redis.duplicate === 'function') {
      const pubClient = redis.duplicate({ enableOfflineQueue: false });
      const subClient = redis.duplicate({ enableOfflineQueue: false });

      pubClient.on('error', (err) => logger.warn(`[Socket Redis] PubClient Error: ${err.message}`));
      subClient.on('error', (err) => logger.warn(`[Socket Redis] SubClient Error: ${err.message}`));

      io.adapter(createAdapter(pubClient, subClient));
      logger.info(`🔌 [Socket] Redis Adapter attached for cluster mode (${redisConfig?.host})`);
    } else {
      logger.info('⚡ [Socket] Using high-performance native in-memory adapter (Instant inbox updates)');
    }
  } catch (err) {
    logger.warn('[Socket] Redis Adapter skipped, running native in-memory:', err.message);
  }

  io.use(async (socket, next) => {
    try {
      // Bot Authentication bypass
      if (socket.handshake.auth.botSecret === process.env.JWT_SECRET) {
        socket.userId = 'zoom-bot';
        socket.userRole = 'admin';
        return next();
      }

      // Assuming token is passed in auth object or query
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // We need the role here, so we fetch the user from DB (or we could include role in JWT)
      const User = require('../models/User');
      const user = await User.findById(decoded.id);
      
      if (!user) return next(new Error('User not found'));
      
      socket.userId = decoded.id;
      socket.userRole = user.role;
      socket.orgId = user.organization ? user.organization.toString() : null;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} for User: ${socket.userId} (${socket.userRole})`);
    
    // Join a room for the specific user so we can emit to all their devices
    socket.join(`user_${socket.userId}`);

    // Join organization room if available
    if (socket.orgId) {
      socket.join(`org_${socket.orgId}`);
      logger.info(`User ${socket.userId} joined org_${socket.orgId}`);
    }

    // Dynamic join organization room from frontend
    socket.on('join_org', (orgId) => {
      if (orgId) {
        socket.join(`org_${orgId}`);
        logger.info(`Socket ${socket.id} explicitly joined org_${orgId}`);
      }
    });

    // If admin, join the admin room
    if (socket.userRole === 'admin') {
      socket.join('admin_room');
      logger.info(`Admin joined admin_room: ${socket.userId}`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Handle joining specific class rooms for audio streaming
    socket.on('join_class', (classId) => {
      socket.join(`class_${classId}`);
      logger.info(`Socket ${socket.id} joined class_${classId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Emits an event to a specific user's room and organization room
const emitToUser = (userId, event, data, orgId = null) => {
  if (io) {
    const cleanUserId = userId ? (userId._id || userId).toString() : null;
    if (cleanUserId) {
      io.to(`user_${cleanUserId}`).emit(event, data);
    }
    const cleanOrgId = orgId ? (orgId._id || orgId).toString() : null;
    if (cleanOrgId) {
      io.to(`org_${cleanOrgId}`).emit(event, data);
    }
    // Also emit to admin room for monitoring
    io.to('admin_room').emit(event, data);
  }
};

// Emits a structured notification to a specific user and organization
const emitNotification = (userId, { type, title, message, conversationId, platform }, orgId = null) => {
  if (io) {
    const cleanUserId = userId ? (userId._id || userId).toString() : null;
    const cleanOrgId = orgId ? (orgId._id || orgId).toString() : null;
    const payload = {
      id: Date.now().toString(),
      type,         // 'new_message' | 'human_handoff' | 'system'
      title,
      message,
      conversationId: conversationId?.toString() || null,
      platform: platform || null,
      timestamp: new Date().toISOString(),
      read: false,
    };
    if (cleanUserId) io.to(`user_${cleanUserId}`).emit('new_notification', payload);
    if (cleanOrgId) io.to(`org_${cleanOrgId}`).emit('new_notification', payload);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitNotification,
};
