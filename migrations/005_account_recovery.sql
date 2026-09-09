ALTER TABLE lumi_accounts ADD COLUMN email_verified_at timestamptz;
CREATE TABLE lumi_account_tokens (
 token_hash text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES lumi_accounts(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('reset','verify')),
 expires_at timestamptz NOT NULL,
 UNIQUE(account_id,purpose)
);
