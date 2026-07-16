CREATE TABLE IF NOT EXISTS coaching_knowledge_claims (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  author TEXT NOT NULL,
  published_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  principle TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'General',
  stance TEXT NOT NULL DEFAULT 'contextual',
  tags_json TEXT NOT NULL DEFAULT '[]',
  cards_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'quarantined' CHECK(status IN ('quarantined','approved','rejected')),
  reviewer_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS coaching_knowledge_review ON coaching_knowledge_claims(status, format, created_at);
