/**
 * Test script for the notification system
 * 
 * This script demonstrates how to:
 * 1. Send notifications programmatically
 * 2. Manually trigger notification checks
 * 3. Test email delivery
 * 
 * Usage: node test-notifications.js
 */

require('dotenv').config();
const { sendNotification, checkTaskDeadlines, checkOverdueTasks } = require('./src/services/notificationService');
const { query } = require('./src/config/db');

async function testNotificationSystem() {
  console.log('🧪 Testing Notification System\n');

  try {
    // 1. Get a test user
    console.log('1️⃣ Finding test user...');
    const userResult = await query('SELECT id, name, email FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database. Please create a user first.');
      process.exit(1);
    }

    const testUser = userResult.rows[0];
    console.log(`✅ Found user: ${testUser.name} (${testUser.email})\n`);

    // 2. Send a test notification
    console.log('2️⃣ Sending test notification...');
    const result = await sendNotification({
      userId: testUser.id,
      type: 'ai_alert',
      title: 'Test Notification',
      body: 'This is a test notification from the notification system.',
      sendEmail: true,
    });

    if (result.success) {
      console.log('✅ Notification sent successfully');
      console.log(`   Notification ID: ${result.notification.id}\n`);
    } else {
      console.log(`❌ Failed to send notification: ${result.error}\n`);
    }

    // 3. Check for tasks with upcoming deadlines
    console.log('3️⃣ Checking for tasks with upcoming deadlines...');
    await checkTaskDeadlines();
    console.log('✅ Task deadline check completed\n');

    // 4. Check for overdue tasks
    console.log('4️⃣ Checking for overdue tasks...');
    await checkOverdueTasks();
    console.log('✅ Overdue task check completed\n');

    // 5. Display notification statistics
    console.log('5️⃣ Notification Statistics:');
    const stats = await query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        COUNT(*) FILTER (WHERE type = 'task_reminder') as task_reminders,
        COUNT(*) FILTER (WHERE type = 'task_overdue') as overdue_alerts,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM notifications
      WHERE user_id = $1
    `, [testUser.id]);

    const stat = stats.rows[0];
    console.log(`   Total notifications: ${stat.total_notifications}`);
    console.log(`   Unread: ${stat.unread_count}`);
    console.log(`   Task reminders: ${stat.task_reminders}`);
    console.log(`   Overdue alerts: ${stat.overdue_alerts}`);
    console.log(`   Last 24 hours: ${stat.last_24h}\n`);

    // 6. Display email delivery logs
    console.log('6️⃣ Recent Email Delivery Logs:');
    const logs = await query(`
      SELECT 
        nl.channel,
        nl.status,
        nl.sent_at,
        nl.error_message,
        n.title
      FROM notification_logs nl
      JOIN notifications n ON n.id = nl.notification_id
      WHERE n.user_id = $1
        AND nl.channel = 'email'
      ORDER BY nl.created_at DESC
      LIMIT 5
    `, [testUser.id]);

    if (logs.rows.length === 0) {
      console.log('   No email logs found\n');
    } else {
      logs.rows.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.title}`);
        console.log(`      Status: ${log.status}`);
        if (log.sent_at) {
          console.log(`      Sent: ${new Date(log.sent_at).toLocaleString()}`);
        }
        if (log.error_message) {
          console.log(`      Error: ${log.error_message}`);
        }
      });
      console.log('');
    }

    console.log('✅ All tests completed successfully!');
    console.log('\n📝 Notes:');
    console.log('   - Email notifications require EMAIL_* environment variables to be configured');
    console.log('   - Quiet hours (10 PM - 8 AM) will suppress email delivery');
    console.log('   - User preferences control which notifications are sent');
    console.log('   - The scheduler runs automatically every 30 minutes when the server is running\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testNotificationSystem();
