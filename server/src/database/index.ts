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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      bio TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      ownerId TEXT,
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
      status TEXT NOT NULL DEFAULT 'active',
      currentPrice REAL NOT NULL DEFAULT 0,
      bidCount INTEGER NOT NULL DEFAULT 0,
      soldPrice REAL,
      scheduledAt TEXT,
      publishedAt TEXT,
      FOREIGN KEY (ownerId) REFERENCES users(id)
    )
  `)

  const cols = db.exec("PRAGMA table_info(items)")
  const colNames = cols[0]?.values.map((c: unknown[]) => c[1]) || []
  if (!colNames.includes('ownerId')) {
    db.run(`ALTER TABLE items ADD COLUMN ownerId TEXT`)
  }
  if (!colNames.includes('currentPrice')) {
    db.run(`ALTER TABLE items ADD COLUMN currentPrice REAL NOT NULL DEFAULT 0`)
  }
  if (!colNames.includes('bidCount')) {
    db.run(`ALTER TABLE items ADD COLUMN bidCount INTEGER NOT NULL DEFAULT 0`)
  }
  if (!colNames.includes('soldPrice')) {
    db.run(`ALTER TABLE items ADD COLUMN soldPrice REAL`)
  }
  if (!colNames.includes('scheduledAt')) {
    db.run(`ALTER TABLE items ADD COLUMN scheduledAt TEXT`)
  }
  if (!colNames.includes('publishedAt')) {
    db.run(`ALTER TABLE items ADD COLUMN publishedAt TEXT`)
  }

  migratePublishedAt(db)

  db.run(`
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      bidder TEXT NOT NULL,
      bidderId TEXT,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id),
      FOREIGN KEY (bidderId) REFERENCES users(id)
    )
  `)

  const bidCols = db.exec("PRAGMA table_info(bids)")
  const bidColNames = bidCols[0]?.values.map((c: unknown[]) => c[1]) || []
  if (!bidColNames.includes('bidderId')) {
    db.run(`ALTER TABLE bids ADD COLUMN bidderId TEXT`)
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (itemId) REFERENCES items(id),
      UNIQUE(userId, itemId)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      itemTitle TEXT NOT NULL,
      itemImageUrl TEXT,
      sellerId TEXT,
      buyerId TEXT,
      buyerName TEXT NOT NULL,
      buyerPhone TEXT,
      buyerAddress TEXT,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      remark TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      confirmedAt TEXT,
      paidAt TEXT,
      shippedAt TEXT,
      completedAt TEXT,
      cancelledAt TEXT,
      FOREIGN KEY (itemId) REFERENCES items(id),
      FOREIGN KEY (sellerId) REFERENCES users(id),
      FOREIGN KEY (buyerId) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      userId TEXT,
      username TEXT NOT NULL,
      parentId TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (parentId) REFERENCES comments(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      data TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      relatedId TEXT,
      relatedType TEXT,
      createdAt TEXT NOT NULL,
      readAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sensitive_words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'other',
      level TEXT NOT NULL DEFAULT 'medium',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS review_records (
      id TEXT PRIMARY KEY,
      targetId TEXT NOT NULL,
      targetType TEXT NOT NULL,
      reviewerId TEXT NOT NULL,
      reviewerName TEXT NOT NULL,
      action TEXT NOT NULL,
      rejectReason TEXT,
      rejectReasonId TEXT,
      beforeStatus TEXT NOT NULL,
      afterStatus TEXT NOT NULL,
      remark TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (reviewerId) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS reject_reason_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      isDefault INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  const commentCols = db.exec("PRAGMA table_info(comments)")
  const commentColNames = commentCols[0]?.values.map((c: unknown[]) => c[1]) || []
  if (!commentColNames.includes('rejectReason')) {
    db.run(`ALTER TABLE comments ADD COLUMN rejectReason TEXT`)
  }
  if (!commentColNames.includes('rejectReasonId')) {
    db.run(`ALTER TABLE comments ADD COLUMN rejectReasonId TEXT`)
  }
  if (!commentColNames.includes('reviewerId')) {
    db.run(`ALTER TABLE comments ADD COLUMN reviewerId TEXT`)
  }
  if (!commentColNames.includes('reviewedAt')) {
    db.run(`ALTER TABLE comments ADD COLUMN reviewedAt TEXT`)
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sales_archives (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      itemId TEXT NOT NULL,
      itemTitle TEXT NOT NULL,
      itemImageUrl TEXT,
      sellerId TEXT,
      buyerId TEXT,
      buyerName TEXT NOT NULL,
      destination TEXT,
      finalPrice REAL NOT NULL DEFAULT 0,
      farewellMessage TEXT,
      emotionTags TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      archivedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id),
      FOREIGN KEY (itemId) REFERENCES items(id),
      FOREIGN KEY (sellerId) REFERENCES users(id),
      FOREIGN KEY (buyerId) REFERENCES users(id)
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

function migratePublishedAt(db: Database): void {
  db.run(`
    UPDATE items 
    SET publishedAt = COALESCE(scheduledAt, createdAt)
    WHERE status IN ('active', 'sold') 
      AND publishedAt IS NULL
  `)
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase(db)
    db.close()
    db = null
  }
}
