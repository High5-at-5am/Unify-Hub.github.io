-- Chat: replies, attachments, read tracking
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN file_url TEXT;
ALTER TABLE messages ADD COLUMN file_name TEXT;
ALTER TABLE messages ADD COLUMN mime_type TEXT;

CREATE TABLE channel_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- Announcements: pin + expiry (scheduling columns already existed)
ALTER TABLE announcements ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE announcements ADD COLUMN expires_at TIMESTAMPTZ;

-- Files: allow a team-less "General" folder
ALTER TABLE team_files ALTER COLUMN team_id DROP NOT NULL;

-- Recurring task templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  assign_type TEXT NOT NULL CHECK (assign_type IN ('individual','team','everyone')),
  assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('daily','weekly','monthly')),
  day_of_week INTEGER,
  day_of_month INTEGER,
  due_time TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_date DATE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);