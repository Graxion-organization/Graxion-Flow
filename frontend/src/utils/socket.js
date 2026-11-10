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

const getCurrentToken = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

/**
 * Returns the singleton socket instance.
 * Always creates a real Socket.IO client instance so event listeners attached
 * before or during authentication remain registered and active once connected.
 */
export const getSocket = () => {
  const token = getCurrentToken();

  if (socket) {
    if (token && !socket.connected && !socket.active) {
      socket.auth = { token };
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: Boolean(token),
    auth: (cb) => {
      cb({ token: getCurrentToken() });
    },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => {
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null;
    if (orgId) {
      socket.emit('join_org', orgId);
    }
  });

  socket.on('disconnect', () => {
    // Reconnection is handled automatically by Socket.IO
  });

  socket.on('connect_error', () => {
    // Update auth token on next reconnection attempt
    const latestToken = getCurrentToken();
    if (latestToken) {
      socket.auth = { token: latestToken };
    }
  });

  return socket;
};

/**
 * Re-authenticates or reconnects the singleton socket when token/workspace changes.
 */
export const reconnectSocket = () => {
  const s = getSocket();
  const token = getCurrentToken();
  if (!token) return;
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  } else {
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null;
    if (orgId) {
      s.emit('join_org', orgId);
    }
  }
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
