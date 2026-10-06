CREATE TABLE IF NOT EXISTS guided_drafts (
  user_key TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1,
  draft_json TEXT,
  phase TEXT NOT NULL DEFAULT 'active' CHECK (phase IN ('active', 'completing', 'complete', 'cleared')),
  completion_id TEXT,
  result_json TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
