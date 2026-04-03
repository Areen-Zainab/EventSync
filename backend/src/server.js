require('dotenv').config();
const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/db');
const { buildSocketServer } = require('./realtime/socketServer');

const PORT = process.env.PORT || 5000;

// Initialize server and test DB connection
const startServer = async () => {
  try {
    // 1. Test database connection
    await testConnection();
    
    // 2. Start HTTP + Socket.IO server
    const server = http.createServer(app);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    buildSocketServer(server, frontendUrl);

    server.listen(PORT, () => {
      console.log(`[SERVER] Running successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[SERVER_ERROR] Failed to start server:`, error.message);
    process.exit(1);
  }
};

startServer();
