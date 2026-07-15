const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

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
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} for User: ${socket.userId} (${socket.userRole})`);
    
    // Join a room for the specific user so we can emit to all their devices
    socket.join(`user_${socket.userId}`);

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

// Emits an event to a specific user's room
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

// Emits a structured notification to a specific user
const emitNotification = (userId, { type, title, message, conversationId, platform }) => {
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', {
      id: Date.now().toString(),
      type,         // 'new_message' | 'human_handoff' | 'system'
      title,
      message,
      conversationId: conversationId?.toString() || null,
      platform: platform || null,
      timestamp: new Date().toISOString(),
      read: false,
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitNotification,
};
