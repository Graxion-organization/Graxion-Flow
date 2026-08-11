import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const socket = io(URL, {
  autoConnect: false, // Wait for connectSocket() to be called
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  withCredentials: true,
  // Removed transports: ['websocket'] to allow fallback to HTTP long-polling if WSS fails
});

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Global listeners for debugging
socket.on('connect', () => {
  console.log('[Socket] Connected to Social Hub WebSocket', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected from Social Hub WebSocket:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection Error:', err.message);
});

export default socket;
