ALTER TABLE lumi_accounts ADD COLUMN display_name text CHECK (length(display_name) BETWEEN 1 AND 100);
ALTER TABLE lumi_accounts ADD COLUMN terms_version text;
ALTER TABLE lumi_accounts ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE lumi_sessions ADD COLUMN remember_me boolean NOT NULL DEFAULT true;
