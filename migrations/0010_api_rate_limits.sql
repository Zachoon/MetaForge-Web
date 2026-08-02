CREATE TABLE IF NOT EXISTS api_rate_limits (
  user_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_bucket INTEGER NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_key, endpoint, window_bucket)
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_bucket ON api_rate_limits(window_bucket);
