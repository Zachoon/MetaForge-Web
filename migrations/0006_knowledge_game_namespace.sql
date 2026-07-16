ALTER TABLE coaching_knowledge_claims ADD COLUMN game TEXT NOT NULL DEFAULT 'mtg';
CREATE INDEX IF NOT EXISTS coaching_knowledge_game_review ON coaching_knowledge_claims(game, status, format, created_at);
