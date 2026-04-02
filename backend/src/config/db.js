const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'eventsync',
};

let pool = new Pool(dbConfig);
let schemaInitialized = false;

const createPool = () => {
  pool = new Pool(dbConfig);
  module.exports.pool = pool;
};

const createDatabaseIfMissing = async () => {
  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    const safeDbName = dbConfig.database.replace(/"/g, '""');
    await adminClient.query(`CREATE DATABASE "${safeDbName}"`);
  } finally {
    await adminClient.end();
  }

  console.log(`[DATABASE] Created missing database "${dbConfig.database}".`);
};

const initializeSchemaIfEnabled = async () => {
  const shouldInitSchema = process.env.DB_AUTO_INIT !== 'false';
  if (!shouldInitSchema || schemaInitialized) {
    return;
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);

  const taskMigrationPath = path.join(__dirname, 'task_manual_kanban_migration.sql');
  if (fs.existsSync(taskMigrationPath)) {
    const taskMigrationSql = fs.readFileSync(taskMigrationPath, 'utf8');
    await pool.query(taskMigrationSql);
  }

  schemaInitialized = true;
  console.log('[DATABASE] Schema initialized successfully.');
};

// Convenience query wrapper
const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('[DATABASE] PostgreSQL connected successfully.');
    client.release();
    await initializeSchemaIfEnabled();
  } catch (error) {
    const isDbMissing = error.code === '3D000';
    const canAutoCreate = process.env.NODE_ENV !== 'production';

    if (isDbMissing && canAutoCreate) {
      console.warn(`[DATABASE_WARNING] ${error.message}. Attempting to create database automatically...`);
      await createDatabaseIfMissing();
      createPool();

      const retryClient = await pool.connect();
      console.log('[DATABASE] PostgreSQL connected successfully after database creation.');
      retryClient.release();
      await initializeSchemaIfEnabled();
      return;
    }

    console.error('[DATABASE_ERROR] Failed to connect to PostgreSQL:', error.message);
    throw error;
  }
};

module.exports = { pool, query, testConnection };
