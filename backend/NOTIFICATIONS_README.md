# Notification System

This notification system provides comprehensive task reminders, deadline alerts, and team activity notifications with support for both in-app and email delivery.

## Features

- ✅ **Task Reminders**: Automatic reminders for tasks due within 24 hours
- ⚠️ **Overdue Alerts**: Notifications for tasks past their deadline
- 📋 **Task Assignment**: Notifications when tasks are assigned to users
- ✅ **Task Completion**: Notifications when tasks are completed
- 🔕 **Quiet Hours**: Respects quiet hours (10 PM - 8 AM) for email notifications
- ⚙️ **User Preferences**: Customizable notification settings per user
- 📧 **Email Notifications**: Optional email delivery for important alerts
- 🔔 **In-App Notifications**: Real-time notifications in the dashboard

## Configuration

### Email Setup (Optional)

To enable email notifications, add these environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=EventSync <noreply@eventsync.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

#### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password as `EMAIL_PASSWORD`

#### Other Email Providers

- **Outlook/Office365**: `smtp.office365.com`, port 587
- **Yahoo**: `smtp.mail.yahoo.com`, port 587
- **SendGrid**: `smtp.sendgrid.net`, port 587
- **Mailgun**: `smtp.mailgun.org`, port 587

### Scheduler Configuration

The notification scheduler runs every 30 minutes by default. It checks for:
- Tasks due within 24 hours (sends reminders)
- Overdue tasks (sends alerts)

To modify the interval, edit `backend/src/services/notificationScheduler.js`:

```javascript
// Change from 30 minutes to your desired interval
schedulerInterval = setInterval(() => {
  runChecks();
}, 30 * 60 * 1000); // 30 minutes in milliseconds
```

## API Endpoints

### Get Notifications
```
GET /api/notifications
Authorization: Bearer <token>
Query Parameters:
  - type: Filter by notification type (optional)
  - is_read: Filter by read status (optional)
  - limit: Number of notifications to return (default: 50)
```

### Get Unread Count
```
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

### Mark as Read
```
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read
```
PATCH /api/notifications/mark-all-read
Authorization: Bearer <token>
```

### Delete Notification
```
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### Get Preferences
```
GET /api/notifications/preferences
Authorization: Bearer <token>
```

### Update Preferences
```
PUT /api/notifications/preferences
Authorization: Bearer <token>
Body: {
  "task_reminders": true,
  "ai_alerts": true,
  "team_updates": false,
  "quiet_hours": true
}
```

## Notification Types

- `task_reminder`: Task deadline approaching (within 24 hours)
- `task_overdue`: Task is past its due date
- `task_assigned`: Task has been assigned to you
- `task_completed`: Task you created has been completed
- `ai_alert`: AI-generated alerts and suggestions
- `team_activity`: Team member activity and updates

## User Preferences

Users can control their notification preferences:

- **Task Reminders**: Enable/disable task deadline and overdue notifications
- **AI Alerts**: Enable/disable AI-generated notifications
- **Team Updates**: Enable/disable team activity notifications
- **Quiet Hours**: Enable/disable quiet hours (10 PM - 8 AM)

When quiet hours are enabled, email notifications will not be sent during those hours, but in-app notifications will still be created.

## Database Schema

The notification system uses two tables:

### `notifications`
Stores all in-app notifications with metadata about related tasks/events.

### `notification_logs`
Tracks delivery attempts for email and push notifications, including success/failure status.

## Programmatic Usage

To send a notification from your code:

```javascript
const { sendNotification } = require('./services/notificationService');

await sendNotification({
  userId: 'user-uuid',
  type: 'task_reminder',
  title: 'Task Deadline Approaching',
  body: 'Your task "Complete project" is due in 2 hours.',
  relatedTaskId: 'task-uuid',
  relatedEventId: 'event-uuid', // optional
  sendEmail: true, // optional, defaults to true
});
```

## Testing

To manually trigger notification checks:

```javascript
const { runChecks } = require('./services/notificationScheduler');
await runChecks();
```

## Troubleshooting

### Email not sending
1. Check that email credentials are configured in `.env`
2. Verify the email transporter initialization logs on server startup
3. Check `notification_logs` table for error messages
4. Ensure firewall allows outbound SMTP connections

### Notifications not appearing
1. Verify the scheduler is running (check server logs)
2. Check that tasks have due dates set
3. Verify user preferences allow the notification type
4. Check database for created notifications

### Quiet hours not working
1. Verify server timezone is correct
2. Check `user_settings.quiet_hours` is set to `true`
3. Quiet hours only affect email delivery, not in-app notifications

## Installation

Install the required dependency:

```bash
cd backend
npm install nodemailer
```

The notification system will automatically start when the server starts.
