const socketIo = require('socket.io');

let io;
const connectionHandlers = [];

const initSockets = (server) => {
  io = socketIo(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Trigger registered connection handlers (e.g. emit initial ESP32 status)
    for (const handler of connectionHandlers) {
      try {
        handler(socket);
      } catch (err) {
        console.error('Socket connection handler error:', err.message);
      }
    }

    // ESP32 or Dashboard can emit events
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Example of bi-directional communication (Laptop -> ESP32)
    socket.on('warning_command', (data) => {
      console.log('Sending warning command to ESP32:', data);
      // Broadcast to ESP32 (or specific room/device)
      socket.broadcast.emit('esp32_command', data);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

const onClientConnected = (fn) => {
  if (typeof fn === 'function') {
    connectionHandlers.push(fn);
  }
};

module.exports = {
  initSockets,
  getIo,
  onClientConnected
};
