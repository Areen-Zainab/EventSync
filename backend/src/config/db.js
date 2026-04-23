const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');

const getDbConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasConnectionString = Boolean(process.env.DATABASE_URL);

  if (hasConnectionString) {
    return {
      connectionString: process.env.DATABASE_URL,
      // Managed Postgres providers (Railway/Render/etc.) commonly require SSL in production.
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    database: process.env.DB_NAME || process.env.PGDATABASE || 'eventsync',
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
};

const dbConfig = getDbConfig();

let pool = new Pool(dbConfig);
let schemaInitialized = false;

const createPool = () => {
  pool = new Pool(dbConfig);
  module.exports.pool = pool;
};

const createDatabaseIfMissing = async () => {
  if (dbConfig.connectionString) {
    throw new Error('Automatic database creation is not supported when DATABASE_URL is used.');
  }

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
