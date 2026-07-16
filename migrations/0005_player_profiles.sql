CREATE TABLE IF NOT EXISTS account_player_profiles (
  user_key TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
