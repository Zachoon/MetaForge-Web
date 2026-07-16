CREATE TABLE IF NOT EXISTS data_goblin_runs (
  id TEXT PRIMARY KEY, game TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT, status TEXT NOT NULL, sources_checked INTEGER NOT NULL DEFAULT 0,
  sources_discovered INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS data_goblin_sources (
  id TEXT PRIMARY KEY, game TEXT NOT NULL, url TEXT NOT NULL, source_class TEXT NOT NULL,
  trust_tier TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'verified-source',
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game,url)
);
CREATE INDEX IF NOT EXISTS data_goblin_source_game ON data_goblin_sources(game,status,last_seen_at);
