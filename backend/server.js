require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const { initSockets } = require('./src/sockets');
const apiRoutes = require('./src/routes/api');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Init Socket.IO
initSockets(server);

const cookieParser = require('cookie-parser');

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Skip logging for high-frequency polling routes so the console doesn't get flooded
app.use(morgan('dev', {
  skip: (req, res) => {
    const url = req.originalUrl || req.url;
    return url.includes('/api/telemetry') || url.includes('/api/ai/prediction');
  }
}));

const path = require('path');
const fs = require('fs');

// Ensure public clips folder exists for incident video black box recording
const clipsDir = path.join(__dirname, 'public', 'clips');
if (!fs.existsSync(clipsDir)) {
  fs.mkdirSync(clipsDir, { recursive: true });
}

// Serve incident video clips statically
app.use('/clips', express.static(clipsDir));

// Serve static Emergency QR Portal for Good Samaritans
const portalDir = path.join(__dirname, '..', 'emergency-portal');
if (fs.existsSync(portalDir)) {
  app.use('/portal', express.static(portalDir));
}

// Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} (0.0.0.0)`);
});
