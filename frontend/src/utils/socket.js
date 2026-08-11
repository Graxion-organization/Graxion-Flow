import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '').replace(/['"]/g, '').replace(/\/$/, '')
  : 'http://localhost:5000';

let socket = null;

/**
 * Returns the singleton socket instance.
 * Creates and connects it on first call using the JWT from localStorage.
 * Subsequent calls return the same connected instance.
 */
export const getSocket = () => {
  if (socket) return socket;

  // The app stores the JWT as 'authToken' in localStorage (see store/index.js)
  const token = localStorage.getItem('authToken');

  if (!token) {
    console.warn('[Socket] No authToken found in localStorage. Socket will not connect.');
    // Return a dummy no-op object so callers don't crash
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
      connected: false,
    };
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket'],
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
