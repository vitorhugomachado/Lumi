CREATE TABLE IF NOT EXISTS lumi_accounts (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK (length(email) <= 254),
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lumi_sessions (
 token_hash text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES lumi_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lumi_sessions_account ON lumi_sessions(account_id);
CREATE INDEX IF NOT EXISTS lumi_sessions_expiry ON lumi_sessions(expires_at);
CREATE TABLE IF NOT EXISTS lumi_profiles (
 account_id uuid PRIMARY KEY REFERENCES lumi_accounts(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
 age_months integer NOT NULL CHECK (age_months BETWEEN 24 AND 59),
 interests jsonb NOT NULL CHECK (jsonb_typeof(interests)='array'),
 known_words jsonb NOT NULL CHECK (jsonb_typeof(known_words)='array'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lumi_activities (
 id uuid NOT NULL,
 account_id uuid NOT NULL REFERENCES lumi_accounts(id) ON DELETE CASCADE,
 category text NOT NULL CHECK (length(category) BETWEEN 1 AND 30),
 word text NOT NULL CHECK (length(word) BETWEEN 1 AND 80),
 seconds integer NOT NULL CHECK (seconds BETWEEN 0 AND 180),
 happened_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,id)
);
CREATE INDEX IF NOT EXISTS lumi_activities_account_time ON lumi_activities(account_id,happened_at DESC);
CREATE TABLE IF NOT EXISTS lumi_rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL,
 expires_at timestamptz NOT NULL
);
