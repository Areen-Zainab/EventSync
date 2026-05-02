-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL CHECK (type IN ('task_reminder', 'task_overdue', 'task_assigned', 'task_completed', 'ai_alert', 'team_activity', 'event_invite')),
  title           VARCHAR(200) NOT NULL,
  body            TEXT NOT NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  related_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications (user_id, is_read, created_at DESC);

-- Notification logs (for tracking sent emails/push notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'in_app')),
  status          VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification 
  ON notification_logs (notification_id);
