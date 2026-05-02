DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%task_reminder%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('task_reminder', 'task_overdue', 'task_assigned', 'task_completed', 'ai_alert', 'team_activity', 'event_invite'));