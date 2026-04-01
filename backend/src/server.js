require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Initialize server and test DB connection
const startServer = async () => {
  try {
    // 1. Test database connection
    await testConnection();
    
    // 2. Start Express server
    app.listen(PORT, () => {
      console.log(`[SERVER] Running successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[SERVER_ERROR] Failed to start server:`, error.message);
    process.exit(1);
  }
};

startServer();
