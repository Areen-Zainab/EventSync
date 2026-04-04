/**
 * Setup notification tables in the database
 * 
 * This script creates the notifications and notification_logs tables
 * 
 * Usage: node setup-notifications-db.js
 */

require('dotenv').config();
const { query } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function setupNotificationTables() {
  console.log('🔧 Setting up notification tables...\n');

  try {
    // Read the notifications schema SQL file
    const schemaPath = path.join(__dirname, 'src', 'config', 'notifications_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading notifications_schema.sql...');
    console.log('📊 Creating tables...\n');

    // Execute the schema
    await query(schemaSql);

    console.log('✅ Successfully created notification tables:');
    console.log('   - notifications');
    console.log('   - notification_logs');
    console.log('   - indexes\n');

    // Verify tables exist
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('notifications', 'notification_logs')
      ORDER BY table_name
    `);

    console.log('✅ Verified tables in database:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n🎉 Notification system database setup complete!');
    console.log('\nYou can now run: node test-notifications.js');

  } catch (err) {
    console.error('❌ Error setting up notification tables:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }

  process.exit(0);
}

setupNotificationTables();
