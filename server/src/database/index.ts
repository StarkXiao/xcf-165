import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { config } from '../config'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbDir = path.dirname(config.dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(config.dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initTables(db)

  return db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      story TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      imageUrl TEXT,
      emotionTags TEXT,
      category TEXT,
      condition TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_createdAt ON items(createdAt);
    CREATE INDEX IF NOT EXISTS idx_items_price ON items(price);
  `)
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
