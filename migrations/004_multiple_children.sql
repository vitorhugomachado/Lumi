ALTER TABLE lumi_profiles ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE lumi_profiles ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE lumi_profiles ALTER COLUMN name DROP NOT NULL;
ALTER TABLE lumi_profiles ALTER COLUMN age_months DROP NOT NULL;
ALTER TABLE lumi_profiles ALTER COLUMN interests SET DEFAULT '[]';
ALTER TABLE lumi_profiles ALTER COLUMN known_words SET DEFAULT '[]';
ALTER TABLE lumi_profiles DROP CONSTRAINT lumi_profiles_pkey;
ALTER TABLE lumi_profiles ADD PRIMARY KEY(id);
ALTER TABLE lumi_profiles ADD UNIQUE(account_id,id);
INSERT INTO lumi_profiles(account_id)
SELECT id FROM lumi_accounts a WHERE NOT EXISTS(SELECT 1 FROM lumi_profiles p WHERE p.account_id=a.id);
ALTER TABLE lumi_activities ADD COLUMN child_id uuid;
UPDATE lumi_activities a SET child_id=p.id FROM lumi_profiles p WHERE p.account_id=a.account_id;
ALTER TABLE lumi_activities ALTER COLUMN child_id SET NOT NULL;
ALTER TABLE lumi_activities ADD FOREIGN KEY(account_id,child_id) REFERENCES lumi_profiles(account_id,id) ON DELETE CASCADE;
CREATE INDEX lumi_activities_child_time ON lumi_activities(account_id,child_id,happened_at DESC);
