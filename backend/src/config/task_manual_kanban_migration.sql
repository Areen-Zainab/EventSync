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
