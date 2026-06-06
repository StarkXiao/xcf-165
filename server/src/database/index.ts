import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { config } from '../config'

let db: Database | null = null

export async function getDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  const dbDir = path.dirname(config.dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  initTables(db)
  saveDatabase(db)

  return db
}

function initTables(db: Database) {
  db.run(`
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
    )
  `)
}

export function saveDatabase(db: Database): void {
  const data = db.export()
  const buffer = Buffer.from(data)
  const dbDir = path.dirname(config.dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  fs.writeFileSync(config.dbPath, buffer)
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase(db)
    db.close()
    db = null
  }
}
