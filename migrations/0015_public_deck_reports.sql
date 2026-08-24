CREATE TABLE IF NOT EXISTS public_deck_reports (
  slug TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  title TEXT NOT NULL,
  commander_name TEXT NOT NULL,
  format_name TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  deck_rows_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_deck_reports_owner ON public_deck_reports(owner_key);
CREATE INDEX IF NOT EXISTS idx_public_deck_reports_updated ON public_deck_reports(updated_at DESC);
