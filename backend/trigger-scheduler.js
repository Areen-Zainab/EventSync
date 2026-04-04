/**
 * Manually trigger notification scheduler checks
 * 
 * This is useful for testing without waiting for the 30-minute interval
 * 
 * Usage: node trigger-scheduler.js
 */

require('dotenv').config();
const { runChecks } = require('./src/services/notificationScheduler');

console.log('🔔 Manually triggering notification checks...\n');

runChecks()
  .then(() => {
    console.log('\n✅ Scheduler checks completed successfully!');
    console.log('Check the notifications page to see results.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error running scheduler checks:', err);
    process.exit(1);
  });
