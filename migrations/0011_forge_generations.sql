CREATE TABLE IF NOT EXISTS forge_generations (
  generation_id TEXT PRIMARY KEY,
  user_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forge_generations_expires ON forge_generations(expires_at);
