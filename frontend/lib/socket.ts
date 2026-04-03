import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
let socketInstance: Socket | null = null;

export const getSocket = () => {
  if (socketInstance) return socketInstance;

  socketInstance = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
  });

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = getToken();
  if (token) {
    socket.auth = { token };
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};
