ALTER TABLE lumi_accounts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE lumi_accounts ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE lumi_accounts ADD COLUMN is_guest boolean NOT NULL DEFAULT false;
ALTER TABLE lumi_accounts ADD CONSTRAINT lumi_account_identity CHECK (
 (is_guest AND email IS NULL AND password_hash IS NULL) OR
 (NOT is_guest AND email IS NOT NULL AND password_hash IS NOT NULL)
);
