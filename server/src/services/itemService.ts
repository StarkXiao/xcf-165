import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Item, ItemCreate, ItemUpdate, QueryParams, PaginatedResponse } from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDatabase()
  const result = fn(db)
  saveDatabase(db)
  return result
}

function rowToItem(row: unknown[]): Item {
  return {
    id: row[0] as string,
    title: row[1] as string,
    description: row[2] as string,
    story: row[3] as string,
    price: row[4] as number,
    imageUrl: row[5] as string,
    emotionTags: row[6] as string,
    category: row[7] as string,
    condition: row[8] as string,
    createdAt: row[9] as string,
    updatedAt: row[10] as string,
    views: row[11] as number,
    likes: row[12] as number,
    status: row[13] as Item['status']
  }
}

export const itemService = {
  async create(data: ItemCreate): Promise<Item> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO items (
          id, title, description, story, price, imageUrl,
          emotionTags, category, condition, createdAt, updatedAt, views, likes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')`
      )
      stmt.run([
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
      ])
      stmt.free()

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      return rowToItem(result[0].values[0])
    })
  },

  async getById(id: string): Promise<Item | undefined> {
    return withDb((db) => {
      db.run(`UPDATE items SET views = views + 1 WHERE id = '${id}'`)

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return undefined
      }
      const item = rowToItem(result[0].values[0])
      item.views += 1
      return item
    })
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

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM items ${whereClause}`
      let countResult: { count: number }

      if (values.length > 0) {
        const countStmt = db.prepare(countSql)
        countStmt.bind(values as (string | number)[])
        countStmt.step()
        countResult = { count: countStmt.getAsObject().count as number }
        countStmt.free()
      } else {
        const res = db.exec(countSql)
        countResult = { count: res[0].values[0][0] as number }
      }

      const offset = (page - 1) * pageSize
      const dataSql = `
        SELECT * FROM items ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let data: Item[] = []
      if (values.length > 0) {
        const dataStmt = db.prepare(dataSql)
        dataStmt.bind(values as (string | number)[])
        while (dataStmt.step()) {
          data.push(rowToItem(dataStmt.get()))
        }
        dataStmt.free()
      } else {
        const res = db.exec(dataSql)
        if (res.length > 0) {
          data = res[0].values.map(rowToItem)
        }
      }

      return {
        data,
        total: countResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.count / pageSize)
      }
    })
  },

  async update(id: string, data: ItemUpdate): Promise<Item | undefined> {
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
    values.push(now)
    values.push(id)

    return withDb((db) => {
      const sql = `UPDATE items SET ${updates.join(', ')} WHERE id = ?`
      const stmt = db.prepare(sql)
      stmt.run(values as (string | number)[])
      stmt.free()

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return undefined
      }
      return rowToItem(result[0].values[0])
    })
  },

  async delete(id: string): Promise<void> {
    return withDb((db) => {
      db.run(`DELETE FROM items WHERE id = '${id}'`)
    })
  },

  async like(id: string): Promise<{ likes: number }> {
    return withDb((db) => {
      db.run(`UPDATE items SET likes = likes + 1 WHERE id = '${id}'`)
      const result = db.exec(`SELECT likes FROM items WHERE id = '${id}'`)
      return { likes: result[0].values[0][0] as number }
    })
  },

  async getStats(): Promise<{
    total: number
    active: number
    sold: number
    totalViews: number
    totalLikes: number
  }> {
    return withDb((db) => {
      const result = db.exec(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
          COALESCE(SUM(views), 0) as totalViews,
          COALESCE(SUM(likes), 0) as totalLikes
        FROM items
      `)
      const row = result[0].values[0]
      return {
        total: row[0] as number,
        active: row[1] as number,
        sold: row[2] as number,
        totalViews: row[3] as number,
        totalLikes: row[4] as number
      }
    })
  }
}
