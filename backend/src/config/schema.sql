-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('Organizer', 'Member')),
  privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
