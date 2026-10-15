-- Anonymous client error reports and worker exceptions.
-- Apply this before deploying the Worker that reads the table:
--   npx wrangler d1 migrations apply metaforge-private-alpha-accounts --remote
CREATE TABLE IF NOT EXISTS error_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  route TEXT,
  build_id TEXT,
  browser TEXT,
  user_agent TEXT,
  viewport TEXT,
  session_id TEXT,
  stack TEXT,
  context_json TEXT NOT NULL DEFAULT '{}',
  count INTEGER NOT NULL DEFAULT 1,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_error_reports_fingerprint ON error_reports(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_reports_last_seen ON error_reports(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_message ON error_reports(message);
