import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL);
    
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return envUrl.replace(/\/api\/?$/, '').replace(/['"]/g, '').replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

let socket = null;

/**
 * Returns the singleton socket instance.
 * Creates and connects it on first call using the JWT from localStorage.
 * Subsequent calls return the same connected instance.
 */
export const getSocket = () => {
  if (socket) return socket;

  // The app stores the JWT as 'authToken' in localStorage (see store/index.js)
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');

  if (!token) {
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
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to', SOCKET_URL, 'ID:', socket.id);
    const orgId = localStorage.getItem('organizationId');
    if (orgId) {
      socket.emit('join_org', orgId);
    }
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
