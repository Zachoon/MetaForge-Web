CREATE TABLE IF NOT EXISTS account_deck_benches (
  user_key TEXT PRIMARY KEY NOT NULL,
  bench_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_deck_benches_updated_at
  ON account_deck_benches(updated_at);
