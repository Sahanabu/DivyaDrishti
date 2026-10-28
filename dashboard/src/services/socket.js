import { io } from 'socket.io-client';

const BACKEND_HOST = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${BACKEND_HOST}:5000`;

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });
      console.log(`Connecting to Socket.IO at ${SOCKET_URL}...`);
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }
}

export const socketService = new SocketService();
