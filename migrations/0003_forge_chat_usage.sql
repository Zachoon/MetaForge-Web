CREATE TABLE IF NOT EXISTS forge_chat_usage (
  user_key TEXT NOT NULL,
  week_start TEXT NOT NULL,
  questions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_key, week_start)
);
CREATE INDEX IF NOT EXISTS idx_forge_chat_usage_week ON forge_chat_usage(week_start);
