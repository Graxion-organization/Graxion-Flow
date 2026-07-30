import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket']
});

// Optional: Global listeners for debugging
socket.on('connect', () => {
  console.log('Connected to Social Hub WebSocket');
});

socket.on('disconnect', () => {
  console.log('Disconnected from Social Hub WebSocket');
});

export default socket;
