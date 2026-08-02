CREATE TABLE IF NOT EXISTS guest_forge_sessions (
  session_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'used')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_forges (
  claim_token TEXT PRIMARY KEY,
  session_key TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_by TEXT,
  claimed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_guest_forge_sessions_expiry ON guest_forge_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_forges_expiry ON guest_forges(expires_at);
