require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { testConnection } = require('./config/db');
const { setIo } = require('./realtime/io');
const { initializeChatSocket } = require('./realtime/chatSocket');
const { startScheduler } = require('./services/notificationScheduler');
const { initializeEmailTransporter } = require('./services/notificationService');

const PORT = process.env.PORT || 5000;

// Initialize server and test DB connection
const startServer = async () => {
  try {
    // 1. Test database connection
    await testConnection();
    
    // 2. Start unified Express + Socket.IO server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
    });
    setIo(io);
    initializeChatSocket(io);

    // 3. Initialize email transporter
    initializeEmailTransporter();
    
    // 4. Start notification scheduler
    startScheduler();

    server.listen(PORT, () => {
      console.log(`[SERVER] Running successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[SERVER_ERROR] Failed to start server:`, error.message);
    process.exit(1);
  }
};

startServer();
