import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase } from '../database'
import type { Item, ItemCreate, ItemUpdate, QueryParams, PaginatedResponse } from '../types'

const db = getDatabase()

export const itemService = {
  async create(data: ItemCreate): Promise<Item> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    const stmt = db.prepare(`
      INSERT INTO items (
        id, title, description, story, price, imageUrl,
        emotionTags, category, condition, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.title,
      data.description,
      data.story,
      data.price,
      data.imageUrl,
      data.emotionTags,
      data.category,
      data.condition,
      now,
      now
    )

    return this.getById(id)
  },

  async getById(id: string): Promise<Item> {
    const stmt = db.prepare('SELECT * FROM items WHERE id = ?')
    const item = stmt.get(id) as Item

    if (item) {
      db.prepare('UPDATE items SET views = views + 1 WHERE id = ?').run(id)
      item.views += 1
    }

    return item
  },

  async list(params: QueryParams): Promise<PaginatedResponse<Item>> {
    const {
      page = 1,
      pageSize = 12,
      category,
      emotionTag,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      keyword,
      status = 'active',
      minPrice,
      maxPrice
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (status) {
      conditions.push('status = ?')
      values.push(status)
    }

    if (category) {
      conditions.push('category = ?')
      values.push(category)
    }

    if (emotionTag) {
      conditions.push('emotionTags LIKE ?')
      values.push(`%${emotionTag}%`)
    }

    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ? OR story LIKE ?)')
      const keywordPattern = `%${keyword}%`
      values.push(keywordPattern, keywordPattern, keywordPattern)
    }

    if (minPrice !== undefined) {
      conditions.push('price >= ?')
      values.push(minPrice)
    }

    if (maxPrice !== undefined) {
      conditions.push('price <= ?')
      values.push(maxPrice)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const validSortFields = ['createdAt', 'price', 'views', 'likes']
    const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const validSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`)
    const { count } = countStmt.get(...values) as { count: number }

    const offset = (page - 1) * pageSize
    const dataStmt = db.prepare(`
      SELECT * FROM items ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT ? OFFSET ?
    `)
    const data = dataStmt.all(...values, pageSize, offset) as Item[]

    return {
      data,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    }
  },

  async update(id: string, data: ItemUpdate): Promise<Item> {
    const now = dayjs().toISOString()
    const updates: string[] = []
    const values: unknown[] = []

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })

    updates.push('updatedAt = ?')
    values.push(now, id)

    const stmt = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)

    return this.getById(id)
  },

  async delete(id: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?')
    stmt.run(id)
  },

  async like(id: string): Promise<{ likes: number }> {
    db.prepare('UPDATE items SET likes = likes + 1 WHERE id = ?').run(id)
    const stmt = db.prepare('SELECT likes FROM items WHERE id = ?')
    return stmt.get(id) as { likes: number }
  },

  async getStats() {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
        SUM(views) as totalViews,
        SUM(likes) as totalLikes
      FROM items
    `)
    return stmt.get()
  }
}
