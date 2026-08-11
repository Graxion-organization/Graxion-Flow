import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

let socket = null;

/**
 * Returns the singleton socket instance.
 * Creates and connects it on first call.
 * Subsequent calls return the same instance.
 */
export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');

  socket = io(URL, {
    auth: { token: token || '' },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection Error:', err.message);
  });

  return socket;
};

/**
 * Disconnects and destroys the singleton socket instance.
 * Call this on logout.
 */
export const destroySocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
