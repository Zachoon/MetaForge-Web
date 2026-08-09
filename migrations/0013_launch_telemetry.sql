CREATE TABLE IF NOT EXISTS launch_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  session_id TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  properties_json TEXT NOT NULL DEFAULT '{}',
  occurred_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launch_events_name_time ON launch_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_launch_events_session_time ON launch_events(session_id, occurred_at);
