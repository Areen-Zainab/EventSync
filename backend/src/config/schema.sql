-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('Organizer', 'Member')),
  plan            VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus', 'premium')),
  privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE users
  ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'plus', 'premium'));

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  task_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ai_alerts      BOOLEAN NOT NULL DEFAULT TRUE,
  team_updates   BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  date        TIMESTAMPTZ,
  venue       VARCHAR(200),
  type        VARCHAR(50),
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Members (junction)
CREATE TABLE IF NOT EXISTS event_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(20) NOT NULL DEFAULT 'Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- Event chat messages
CREATE TABLE IF NOT EXISTS event_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE event_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES event_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mention_user_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(150),
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

CREATE TABLE IF NOT EXISTS message_reads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES event_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_messages_event_created
  ON event_messages (event_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_event_messages_event_parent
  ON event_messages (event_id, parent_message_id);

CREATE INDEX IF NOT EXISTS idx_event_messages_event_pin_created
  ON event_messages (event_id, is_pinned DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_message_reads_message
  ON message_reads (message_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_user
  ON message_reads (user_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  due_date    TIMESTAMPTZ,
  priority    VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees (user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL CONSTRAINT notifications_type_check CHECK (type IN ('task_reminder', 'task_overdue', 'task_assigned', 'task_completed', 'ai_alert', 'team_activity', 'event_invite')),
  title            VARCHAR(200) NOT NULL,
  body             TEXT NOT NULL,
  related_task_id  UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id  UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel          VARCHAR(20) NOT NULL,
  status           VARCHAR(20) NOT NULL,
  sent_at          TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification
  ON notification_logs (notification_id);

-- User feedback
CREATE TABLE IF NOT EXISTS feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback   VARCHAR(20) NOT NULL CHECK (feedback IN ('liked', 'disliked', 'okay')),
  comment    TEXT,
  shown_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created
  ON feedback (user_id, created_at DESC);
