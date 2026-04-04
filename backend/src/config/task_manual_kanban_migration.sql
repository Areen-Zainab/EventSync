-- Manual Kanban task schema migration (safe for existing DBs)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE tasks
ALTER COLUMN event_id DROP NOT NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE event_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  task_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ai_alerts      BOOLEAN NOT NULL DEFAULT TRUE,
  team_updates   BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Keep supported priority values constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Backfill existing rows with default priority if needed
UPDATE tasks
SET priority = 'medium'
WHERE priority IS NULL;

-- Backfill created_by from event owner where possible
UPDATE tasks t
SET created_by = e.created_by
FROM events e
WHERE t.created_by IS NULL
  AND t.event_id = e.id;

-- Notification tables (safe for existing DBs)
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL,
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
