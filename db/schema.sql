-- DDC Travel Journal Database Schema
-- Cloudflare D1 / SQLite

DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS checkpoints;

CREATE TABLE checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE CASCADE
);

CREATE INDEX idx_photos_checkpoint ON photos(checkpoint_id);
CREATE INDEX idx_checkpoints_created ON checkpoints(created_at);
