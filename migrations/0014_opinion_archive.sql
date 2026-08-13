CREATE TABLE IF NOT EXISTS opinion_revisions (
  user_key TEXT NOT NULL,
  opinion_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  context_id TEXT NOT NULL,
  subject TEXT,
  commander_name TEXT,
  verdict TEXT NOT NULL CHECK(verdict IN ('recommend','do_not_recommend','unresolved')),
  confidence_score REAL NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_key, opinion_id, revision)
);

CREATE INDEX IF NOT EXISTS opinion_revisions_latest
  ON opinion_revisions(user_key, opinion_id, revision DESC);

