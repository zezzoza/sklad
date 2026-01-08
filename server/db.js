import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'warehouse.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  weight REAL DEFAULT 0,
  length REAL DEFAULT 0,
  quantity REAL DEFAULT 0,
  unit TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_category_name ON items(category, lower(name));
CREATE TRIGGER IF NOT EXISTS trg_items_updated_at
AFTER UPDATE ON items
BEGIN
  UPDATE items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`);

export const dbFile = dbPath;
export default db;
