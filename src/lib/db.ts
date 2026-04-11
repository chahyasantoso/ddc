import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

const DB_DIR = join(process.cwd(), '.db');
const DB_PATH = join(DB_DIR, 'journal.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const isNew = !existsSync(DB_PATH);
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  if (isNew) {
    // Run schema on first init
    const schema = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf-8');
    _db.exec(schema);
    console.log('[DB] Schema created.');

    // Run seed data
    const seed = readFileSync(join(process.cwd(), 'db', 'seed.sql'), 'utf-8');
    _db.exec(seed);
    console.log('[DB] Seed data inserted.');
  }

  return _db;
}

export interface Checkpoint {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
  description: string | null;
  created_at: string;
}

export interface Photo {
  id: number;
  checkpoint_id: number;
  photo_url: string;
  caption: string;
  order: number;
  created_at: string;
}

export interface CheckpointWithPhotos extends Checkpoint {
  photos: Photo[];
}
