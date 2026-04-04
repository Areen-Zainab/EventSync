const { checkTaskDeadlines, checkOverdueTasks } = require('./notificationService');

let schedulerInterval = null;

// Start the notification scheduler
const startScheduler = () => {
  if (schedulerInterval) {
    console.log('⚠️  Notification scheduler already running');
    return;
  }

  console.log('🚀 Starting notification scheduler...');

  // Run checks immediately on startup
  runChecks();

  // Run checks every 30 minutes
  schedulerInterval = setInterval(() => {
    runChecks();
  }, 30 * 60 * 1000); // 30 minutes

  console.log('✅ Notification scheduler started (runs every 30 minutes)');
};

// Stop the notification scheduler
const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 Notification scheduler stopped');
  }
};

// Run all notification checks
const runChecks = async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n⏰ Running notification checks at ${timestamp}`);

  try {
    await checkTaskDeadlines();
    await checkOverdueTasks();
    console.log('✅ Notification checks completed\n');
  } catch (err) {
    console.error('❌ Error running notification checks:', err);
  }
};

module.exports = {
  startScheduler,
  stopScheduler,
  runChecks,
};
