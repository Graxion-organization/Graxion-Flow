const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');

// Load env vars
dotenv.config();

// Mute Redis/BullMQ connection spam when running locally without Redis
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNREFUSED' && err.port === 6379) return;
  console.error(err);
});
process.on('unhandledRejection', (err) => {
  if (err.code === 'ECONNREFUSED' && err.port === 6379) return;
  // Ignore
});

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
socketService.setIO(io);

// Routes
const authRouter = require('./api/authRouter');
const courseRouter = require('./api/courseRouter');
const batchRouter = require('./api/batchRouter');
const materialRouter = require('./api/materialRouter');
const aiRouter = require('./api/aiRouter');
const sessionRouter = require('./api/sessionRouter');
const agentRouter = require('./api/agentRouter');
const meetingRouter = require('./api/meetingRouter');

// Initialize Workers & Schedulers
require('./workers/pdfWorker');
const { startAutoScheduler } = require('./services/schedulerService');
startAutoScheduler();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/courses', courseRouter);
app.use('/api/batches', batchRouter);
app.use('/api/materials', materialRouter);
app.use('/api/ai', aiRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/agents', agentRouter);
app.use('/api/meetings', meetingRouter);

const { initializeClassNamespace } = require('./sockets/classNamespace');

// Socket.io
io.on('connection', (socket) => {
  console.log(`Global Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Global Socket disconnected: ${socket.id}`);
  });
});

// Initialize dynamic class namespaces
initializeClassNamespace(io);

// Basic Route
app.get('/', (req, res) => {
  res.send('AI Teacher Platform API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
