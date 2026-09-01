CREATE TABLE affirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organization_settings ADD COLUMN affirmations_enabled BOOLEAN NOT NULL DEFAULT true;

INSERT INTO affirmations (message) VALUES ('Small, steady effort adds up. Thank you for showing up today.');
INSERT INTO affirmations (message) VALUES ('What you do here genuinely helps people. Nice work.');
INSERT INTO affirmations (message) VALUES ('Progress over perfection \u2014 today counts.');