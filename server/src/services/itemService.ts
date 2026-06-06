import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Item, ItemCreate, ItemDraftCreate, ItemUpdate, QueryParams, PaginatedResponse, Bid, BidCreate, Favorite } from '../types'
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
    ownerId: (row[1] as string) || null,
    title: row[2] as string,
    description: row[3] as string,
    story: row[4] as string,
    price: row[5] as number,
    imageUrl: row[6] as string,
    emotionTags: row[7] as string,
    category: row[8] as string,
    condition: row[9] as string,
    createdAt: row[10] as string,
    updatedAt: row[11] as string,
    views: row[12] as number,
    likes: row[13] as number,
    status: row[14] as Item['status'],
    currentPrice: (row[15] as number) ?? 0,
    bidCount: (row[16] as number) ?? 0,
    soldPrice: row[17] as number | null,
    scheduledAt: (row[18] as string) || null
  }
}

function rowToBid(row: unknown[]): Bid {
  return {
    id: row[0] as string,
    itemId: row[1] as string,
    bidder: row[2] as string,
    bidderId: (row[3] as string) || null,
    amount: row[4] as number,
    createdAt: row[5] as string
  }
}

export const itemService = {
  async activateScheduledItems(): Promise<number> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const stmt = db.prepare(
        `UPDATE items SET status = 'active', scheduledAt = NULL, updatedAt = ? WHERE status = 'scheduled' AND scheduledAt IS NOT NULL AND scheduledAt <= ?`
      )
      stmt.run([now, now])
      stmt.free()
      const result = db.exec(`SELECT changes() as cnt`)
      return (result[0]?.values[0]?.[0] as number) || 0
    })
  },

  async create(data: ItemCreate): Promise<Item> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    let status: Item['status'] = 'active'
    let scheduledAt: string | null = null
    if (data.scheduledAt) {
      const scheduledTime = dayjs(data.scheduledAt)
      if (scheduledTime.isAfter(dayjs())) {
        status = 'scheduled'
        scheduledAt = data.scheduledAt
      }
    }

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO items (
          id, ownerId, title, description, story, price, imageUrl,
          emotionTags, category, condition, createdAt, updatedAt, views, likes, status,
          currentPrice, bidCount, soldPrice, scheduledAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 0, NULL, ?)`
      )
      stmt.run([
        id,
        data.ownerId || null,
        data.title,
        data.description,
        data.story,
        data.price,
        data.imageUrl,
        data.emotionTags,
        data.category,
        data.condition,
        now,
        now,
        status,
        data.price,
        scheduledAt
      ])
      stmt.free()

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      return rowToItem(result[0].values[0])
    })
  },

  async createDraft(data: ItemDraftCreate): Promise<Item> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    let status: Item['status'] = 'draft'
    let scheduledAt: string | null = null
    if (data.scheduledAt) {
      const scheduledTime = dayjs(data.scheduledAt)
      if (scheduledTime.isAfter(dayjs())) {
        status = 'scheduled'
        scheduledAt = data.scheduledAt
      }
    }

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO items (
          id, ownerId, title, description, story, price, imageUrl,
          emotionTags, category, condition, createdAt, updatedAt, views, likes, status,
          currentPrice, bidCount, soldPrice, scheduledAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, NULL, ?)`
      )
      stmt.run([
        id,
        data.ownerId || null,
        data.title || '',
        data.description || '',
        data.story || '',
        data.price ?? 0,
        data.imageUrl || '',
        data.emotionTags || '',
        data.category || '',
        data.condition || '',
        now,
        now,
        status,
        scheduledAt
      ])
      stmt.free()

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      return rowToItem(result[0].values[0])
    })
  },

  async listByOwner(ownerId: string, params: QueryParams): Promise<PaginatedResponse<Item>> {
    await this.activateScheduledItems()
    const {
      page = 1,
      pageSize = 12,
      category,
      emotionTag,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      keyword,
      status,
      minPrice,
      maxPrice
    } = params

    const conditions: string[] = ['ownerId = ?']
    const values: unknown[] = [ownerId]

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

    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const validSortFields = ['createdAt', 'price', 'views', 'likes', 'scheduledAt']
    const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const validSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM items ${whereClause}`
      let countResult: { count: number }

      const countStmt = db.prepare(countSql)
      countStmt.bind(values as (string | number)[])
      countStmt.step()
      countResult = { count: countStmt.getAsObject().count as number }
      countStmt.free()

      const offset = (page - 1) * pageSize
      const dataSql = `
        SELECT * FROM items ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let data: Item[] = []
      const dataStmt = db.prepare(dataSql)
      dataStmt.bind(values as (string | number)[])
      while (dataStmt.step()) {
        data.push(rowToItem(dataStmt.get()))
      }
      dataStmt.free()

      return {
        data,
        total: countResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.count / pageSize)
      }
    })
  },

  async getFavoritesByUserId(userId: string, params: QueryParams): Promise<PaginatedResponse<Item>> {
    const { page = 1, pageSize = 12 } = params
    return withDb((db) => {
      const countResult = db.exec(
        `SELECT COUNT(*) FROM favorites WHERE userId = '${userId}'`
      )
      const total = (countResult[0]?.values[0]?.[0] as number) || 0

      const offset = (page - 1) * pageSize
      const result = db.exec(
        `SELECT items.* FROM items
         INNER JOIN favorites ON items.id = favorites.itemId
         WHERE favorites.userId = '${userId}'
         ORDER BY favorites.createdAt DESC
         LIMIT ${pageSize} OFFSET ${offset}`
      )

      const data = result.length > 0 ? result[0].values.map(rowToItem) : []
      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  },

  async isFavorite(userId: string, itemId: string): Promise<boolean> {
    return withDb((db) => {
      const result = db.exec(
        `SELECT COUNT(*) FROM favorites WHERE userId = '${userId}' AND itemId = '${itemId}'`
      )
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async addFavorite(userId: string, itemId: string): Promise<Favorite | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()
    return withDb((db) => {
      try {
        const stmt = db.prepare(
          `INSERT INTO favorites (id, userId, itemId, createdAt) VALUES (?, ?, ?, ?)`
        )
        stmt.run([id, userId, itemId, now])
        stmt.free()
        const result = db.exec(`SELECT * FROM favorites WHERE id = '${id}'`)
        return {
          id: result[0].values[0][0] as string,
          userId: result[0].values[0][1] as string,
          itemId: result[0].values[0][2] as string,
          createdAt: result[0].values[0][3] as string
        }
      } catch (e) {
        return { error: '已收藏该藏品' }
      }
    })
  },

  async removeFavorite(userId: string, itemId: string): Promise<boolean> {
    return withDb((db) => {
      db.run(
        `DELETE FROM favorites WHERE userId = '${userId}' AND itemId = '${itemId}'`
      )
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async getById(id: string): Promise<Item | undefined> {
    await this.activateScheduledItems()
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
    await this.activateScheduledItems()
    const {
      page = 1,
      pageSize = 12,
      category,
      emotionTag,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      keyword,
      status,
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
    const validSortFields = ['createdAt', 'price', 'views', 'likes', 'scheduledAt']
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
      if (key === 'scheduledAt' && value !== undefined) {
        const scheduledTime = dayjs(value as string)
        if (scheduledTime.isAfter(dayjs())) {
          updates.push('scheduledAt = ?')
          values.push(value)
          updates.push(`status = 'scheduled'`)
        } else {
          updates.push('scheduledAt = NULL')
          if (!data.status) {
            updates.push(`status = 'active'`)
          }
        }
      } else if (value !== undefined) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (data.status === 'active') {
      updates.push('scheduledAt = NULL')
    }

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
    draft: number
    scheduled: number
    active: number
    sold: number
    totalViews: number
    totalLikes: number
    totalSoldAmount: number
    totalBidCount: number
    highestPrice: number
  }> {
    await this.activateScheduledItems()
    return withDb((db) => {
      const result = db.exec(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
          COALESCE(SUM(views), 0) as totalViews,
          COALESCE(SUM(likes), 0) as totalLikes,
          COALESCE(SUM(CASE WHEN status = 'sold' THEN soldPrice ELSE 0 END), 0) as totalSoldAmount,
          COALESCE(SUM(bidCount), 0) as totalBidCount,
          COALESCE(MAX(currentPrice), 0) as highestPrice
        FROM items
      `)
      const row = result[0].values[0]
      return {
        total: row[0] as number,
        draft: row[1] as number,
        scheduled: row[2] as number,
        active: row[3] as number,
        sold: row[4] as number,
        totalViews: row[5] as number,
        totalLikes: row[6] as number,
        totalSoldAmount: row[7] as number,
        totalBidCount: row[8] as number,
        highestPrice: row[9] as number
      }
    })
  },

  async placeBid(data: BidCreate): Promise<Bid | { error: string }> {
    await this.activateScheduledItems()
    const now = dayjs().toISOString()
    const id = uuidv4()

    return withDb((db) => {
      const itemResult = db.exec(`SELECT * FROM items WHERE id = '${data.itemId}'`)
      if (itemResult.length === 0 || itemResult[0].values.length === 0) {
        return { error: '拍品不存在' }
      }
      const item = rowToItem(itemResult[0].values[0])

      if (item.status !== 'active') {
        return { error: '该拍品已结束竞拍或未上架' }
      }

      const minBid = (item.currentPrice || item.price) + 1
      if (data.amount < minBid) {
        return { error: `出价必须大于等于 ¥${minBid}` }
      }

      const bidStmt = db.prepare(
        `INSERT INTO bids (id, itemId, bidder, bidderId, amount, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
      )
      bidStmt.run([id, data.itemId, data.bidder, data.bidderId || null, data.amount, now])
      bidStmt.free()

      const updateStmt = db.prepare(
        `UPDATE items SET currentPrice = ?, bidCount = bidCount + 1, updatedAt = ? WHERE id = ?`
      )
      updateStmt.run([data.amount, now, data.itemId])
      updateStmt.free()

      const bidResult = db.exec(`SELECT * FROM bids WHERE id = '${id}'`)
      return rowToBid(bidResult[0].values[0])
    })
  },

  async getBidsByItemId(itemId: string): Promise<Bid[]> {
    return withDb((db) => {
      const result = db.exec(
        `SELECT * FROM bids WHERE itemId = '${itemId}' ORDER BY createdAt DESC`
      )
      if (result.length === 0 || result[0].values.length === 0) {
        return []
      }
      return result[0].values.map(rowToBid)
    })
  },

  async markAsSold(id: string): Promise<Item | undefined> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const itemResult = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      if (itemResult.length === 0 || itemResult[0].values.length === 0) {
        return undefined
      }
      const item = rowToItem(itemResult[0].values[0])
      const soldPrice = item.currentPrice || item.price

      const stmt = db.prepare(
        `UPDATE items SET status = 'sold', soldPrice = ?, scheduledAt = NULL, updatedAt = ? WHERE id = ?`
      )
      stmt.run([soldPrice, now, id])
      stmt.free()

      const result = db.exec(`SELECT * FROM items WHERE id = '${id}'`)
      return rowToItem(result[0].values[0])
    })
  }
}
