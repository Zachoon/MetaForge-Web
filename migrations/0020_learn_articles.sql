-- Learn news, evergreen essays, and the review queue.
-- Apply before deploying the Worker that reads these tables:
--   npx wrangler d1 migrations apply metaforge-private-alpha-accounts --remote
CREATE TABLE IF NOT EXISTS learn_articles (
  slug TEXT PRIMARY KEY,
  topic_key TEXT,
  dedupe_key TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  indexable INTEGER NOT NULL DEFAULT 0,
  provenance TEXT NOT NULL,
  review_state TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT,
  updated_at TEXT NOT NULL,
  article_json TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learn_articles_dedupe ON learn_articles(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_learn_articles_public ON learn_articles(status, indexable, updated_at);

CREATE TABLE IF NOT EXISTS learn_topic_coverage (
  topic_id TEXT PRIMARY KEY,
  slug TEXT,
  covered_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS learn_runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,
  interval_hours INTEGER,
  sources_checked INTEGER NOT NULL DEFAULT 0,
  items_seen INTEGER NOT NULL DEFAULT 0,
  items_new INTEGER NOT NULL DEFAULT 0,
  evergreen_topic TEXT,
  error TEXT,
  log_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS learn_source_cache (
  source_id TEXT PRIMARY KEY,
  robots_body TEXT,
  etag TEXT,
  body TEXT,
  fetched_at INTEGER
);
