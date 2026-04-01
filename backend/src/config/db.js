const { Pool } = require('pg');

// Create a reusable connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Helper function to test DB connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('[DATABASE] PostgreSQL connected successfully.');
    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('[DATABASE_ERROR] Failed to connect to PostgreSQL:', error.message);
    throw error; // Re-throw to handle in server.js
  }
};

module.exports = {
  pool,
  testConnection
};
