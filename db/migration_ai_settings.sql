-- AI Settings table for Caption with AI feature
-- Single-row table storing Gemini API key, global context, and caption tone.

CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  gemini_api_key TEXT DEFAULT '',
  global_context TEXT DEFAULT '',
  caption_tone TEXT DEFAULT 'descriptive',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single row
INSERT OR IGNORE INTO ai_settings (id) VALUES (1);
