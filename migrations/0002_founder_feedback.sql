CREATE TABLE IF NOT EXISTS founder_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_founder_feedback_created_at ON founder_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_founder_feedback_user_key ON founder_feedback(user_key);
