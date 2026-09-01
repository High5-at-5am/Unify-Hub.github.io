-- Organization settings
INSERT INTO organization_settings (name) VALUES ('Unify Hub');

-- Default teams (names/colors ported from the original template)
INSERT INTO teams (name, description, color) VALUES ('Logistics', 'Operations, supplies, and coordination', 'coral');
INSERT INTO teams (name, description, color) VALUES ('Graphic Design', 'Visual identity and creative production', 'moss');
INSERT INTO teams (name, description, color) VALUES ('Outreach', 'Community relationships and engagement', 'sky');
INSERT INTO teams (name, description, color) VALUES ('Marketing', 'Campaigns, promotion, and communications', 'ochre');
INSERT INTO teams (name, description, color) VALUES ('Editorial', 'Writing, editing, and publishing', 'brick');

-- Admin account is created by api/setup/bootstrap-admin.js on first run
-- (needs a real PBKDF2 hash computed in JS, not fabricated SQL).