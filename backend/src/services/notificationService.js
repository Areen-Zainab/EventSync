const { query } = require('../config/db');
const nodemailer = require('nodemailer');

// Email transporter configuration
let transporter = null;

const initializeEmailTransporter = () => {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  // Only create transporter if email credentials are configured
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email transporter initialized');
  } else {
    console.log('⚠️  Email credentials not configured. Email notifications disabled.');
  }

  return transporter;
};

// Check if current time is within quiet hours (10 PM - 8 AM)
const isQuietHours = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 22 || hour < 8;
};

// Create a notification in the database
const createNotification = async ({ userId, type, title, body, relatedTaskId = null, relatedEventId = null }) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, body, related_task_id, related_event_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, title, body, relatedTaskId, relatedEventId]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

// Log notification delivery attempt
const logNotificationDelivery = async ({ notificationId, channel, status, errorMessage = null }) => {
  try {
    await query(
      `INSERT INTO notification_logs (notification_id, channel, status, sent_at, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [notificationId, channel, status, status === 'sent' ? new Date() : null, errorMessage]
    );
  } catch (err) {
    console.error('Error logging notification delivery:', err);
  }
};

// Send email notification
const sendEmail = async ({ to, subject, html }) => {
  const emailTransporter = initializeEmailTransporter();
  
  if (!emailTransporter) {
    console.log('Email not sent - transporter not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Error sending email:', err);
    return { success: false, error: err.message };
  }
};

// Get user preferences and email
const getUserPreferences = async (userId) => {
  try {
    const result = await query(
      `SELECT 
        u.email,
        u.name,
        COALESCE(us.task_reminders, TRUE) as task_reminders,
        COALESCE(us.ai_alerts, TRUE) as ai_alerts,
        COALESCE(us.team_updates, FALSE) as team_updates,
        COALESCE(us.quiet_hours, TRUE) as quiet_hours
       FROM users u
       LEFT JOIN user_settings us ON us.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    return null;
  }
};

// Check if user should receive notification based on preferences
const shouldSendNotification = (userPrefs, notificationType) => {
  if (!userPrefs) return false;

  // Check quiet hours
  if (userPrefs.quiet_hours && isQuietHours()) {
    return false;
  }

  // Check notification type preferences
  if (notificationType === 'task_reminder' || notificationType === 'task_overdue') {
    return userPrefs.task_reminders;
  }

  if (notificationType === 'ai_alert') {
    return userPrefs.ai_alerts;
  }

  if (notificationType === 'team_activity' || notificationType === 'task_assigned') {
    return userPrefs.team_updates;
  }

  return true;
};

// Generate email HTML template
const generateEmailTemplate = ({ userName, title, body, actionUrl = null }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">EventSync</h1>
                  <p style="margin: 0; font-size: 14px; color: #666;">Event Management Platform</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <div style="height: 2px; background: linear-gradient(90deg, #7c5cfc 0%, #5c8cfc 100%);"></div>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi ${userName},</p>
                  <h2 style="margin: 0 0 15px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">${title}</h2>
                  <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555;">${body}</p>
                </td>
              </tr>
              ${actionUrl ? `
              <tr>
                <td style="padding: 0 40px 30px 40px;" align="center">
                  <a href="${actionUrl}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #7c5cfc 0%, #5c8cfc 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">View Details</a>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
                    You're receiving this because you have notifications enabled in your EventSync settings.
                    <br>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings" style="color: #7c5cfc; text-decoration: none;">Manage preferences</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Send notification (in-app + email if applicable)
const sendNotification = async ({ userId, type, title, body, relatedTaskId = null, relatedEventId = null, sendEmail: shouldSendEmail = true }) => {
  try {
    // Create in-app notification
    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      relatedTaskId,
      relatedEventId,
    });

    // Log in-app notification
    await logNotificationDelivery({
      notificationId: notification.id,
      channel: 'in_app',
      status: 'sent',
    });

    // Get user preferences
    const userPrefs = await getUserPreferences(userId);

    // Check if we should send email
    if (shouldSendEmail && userPrefs && shouldSendNotification(userPrefs, type)) {
      const actionUrl = relatedTaskId 
        ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/tasks`
        : relatedEventId
        ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/event/${relatedEventId}`
        : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/notifications`;

      const emailHtml = generateEmailTemplate({
        userName: userPrefs.name,
        title,
        body,
        actionUrl,
      });

      const emailResult = await sendEmail({
        to: userPrefs.email,
        subject: `EventSync: ${title}`,
        html: emailHtml,
      });

      // Log email delivery
      await logNotificationDelivery({
        notificationId: notification.id,
        channel: 'email',
        status: emailResult.success ? 'sent' : 'failed',
        errorMessage: emailResult.error || null,
      });
    }

    return { success: true, notification };
  } catch (err) {
    console.error('Error sending notification:', err);
    return { success: false, error: err.message };
  }
};

// Check for upcoming task deadlines and send reminders
const checkTaskDeadlines = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find tasks due within 24 hours that haven't been completed
    const result = await query(
      `SELECT 
        t.id,
        t.title,
        t.due_date,
        t.assigned_to,
        t.created_by,
        t.event_id,
        e.name as event_name
       FROM tasks t
       LEFT JOIN events e ON e.id = t.event_id
       WHERE t.status != 'done'
         AND t.due_date IS NOT NULL
         AND t.due_date <= $1
         AND t.due_date >= $2
         AND (t.assigned_to IS NOT NULL OR t.created_by IS NOT NULL)`,
      [tomorrow, now]
    );

    console.log(`📋 Found ${result.rows.length} tasks with upcoming deadlines`);

    for (const task of result.rows) {
      const dueDate = new Date(task.due_date);
      const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));
      
      const userIds = [task.assigned_to, task.created_by].filter(Boolean);
      const uniqueUserIds = [...new Set(userIds)];

      for (const userId of uniqueUserIds) {
        // Check if we already sent a reminder for this task today
        const existingReminder = await query(
          `SELECT id FROM notifications
           WHERE user_id = $1
             AND related_task_id = $2
             AND type = 'task_reminder'
             AND created_at > NOW() - INTERVAL '24 hours'`,
          [userId, task.id]
        );

        if (existingReminder.rows.length === 0) {
          const title = 'Task Deadline Approaching';
          const body = `"${task.title}" is due in ${hoursUntilDue} hours${task.event_name ? ` (${task.event_name})` : ''}.`;

          await sendNotification({
            userId,
            type: 'task_reminder',
            title,
            body,
            relatedTaskId: task.id,
            relatedEventId: task.event_id,
            sendEmail: true,
          });

          console.log(`✅ Sent reminder to user ${userId} for task "${task.title}"`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking task deadlines:', err);
  }
};

// Check for overdue tasks and send alerts
const checkOverdueTasks = async () => {
  try {
    const now = new Date();

    // Find tasks that are overdue
    const result = await query(
      `SELECT 
        t.id,
        t.title,
        t.due_date,
        t.assigned_to,
        t.created_by,
        t.event_id,
        e.name as event_name
       FROM tasks t
       LEFT JOIN events e ON e.id = t.event_id
       WHERE t.status != 'done'
         AND t.due_date IS NOT NULL
         AND t.due_date < $1
         AND (t.assigned_to IS NOT NULL OR t.created_by IS NOT NULL)`,
      [now]
    );

    console.log(`⚠️  Found ${result.rows.length} overdue tasks`);

    for (const task of result.rows) {
      const dueDate = new Date(task.due_date);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      
      const userIds = [task.assigned_to, task.created_by].filter(Boolean);
      const uniqueUserIds = [...new Set(userIds)];

      for (const userId of uniqueUserIds) {
        // Check if we already sent an overdue alert for this task today
        const existingAlert = await query(
          `SELECT id FROM notifications
           WHERE user_id = $1
             AND related_task_id = $2
             AND type = 'task_overdue'
             AND created_at > NOW() - INTERVAL '24 hours'`,
          [userId, task.id]
        );

        if (existingAlert.rows.length === 0) {
          const title = 'Task Overdue';
          const body = `"${task.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue${task.event_name ? ` (${task.event_name})` : ''}.`;

          await sendNotification({
            userId,
            type: 'task_overdue',
            title,
            body,
            relatedTaskId: task.id,
            relatedEventId: task.event_id,
            sendEmail: true,
          });

          console.log(`⚠️  Sent overdue alert to user ${userId} for task "${task.title}"`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking overdue tasks:', err);
  }
};

module.exports = {
  createNotification,
  sendNotification,
  checkTaskDeadlines,
  checkOverdueTasks,
  isQuietHours,
  initializeEmailTransporter,
};
