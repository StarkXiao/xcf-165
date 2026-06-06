import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Item, ItemCreate, ItemDraftCreate, ItemUpdate, QueryParams, PaginatedResponse, Bid, BidCreate, Favorite, CalendarQueryParams, CalendarData, CalendarDayItem } from '../types'
import type { Database } from 'sql.js'
import { EMOTION_TAGS } from '../types'
import { messageService } from './messageService'

async function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const result = await fn(db)
  saveDatabase(db)
  return result
}

const ITEM_COLUMNS = [
  'id', 'ownerId', 'title', 'description', 'story', 'price', 'imageUrl',
  'emotionTags', 'category', 'condition', 'createdAt', 'updatedAt',
  'views', 'likes', 'status', 'currentPrice', 'bidCount', 'soldPrice',
  'scheduledAt', 'publishedAt'
] as const

const ITEM_SELECT = ITEM_COLUMNS.join(', ')

function objToItem(obj: Record<string, unknown>): Item {
  return {
    id: obj.id as string,
    ownerId: (obj.ownerId as string) || null,
    title: obj.title as string,
    description: obj.description as string,
    story: obj.story as string,
    price: Number(obj.price) ?? 0,
    imageUrl: (obj.imageUrl as string) || '',
    emotionTags: (obj.emotionTags as string) || '',
    category: (obj.category as string) || '',
    condition: (obj.condition as string) || '',
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string,
    views: Number(obj.views) ?? 0,
    likes: Number(obj.likes) ?? 0,
    status: obj.status as Item['status'],
    currentPrice: Number(obj.currentPrice) ?? 0,
    bidCount: Number(obj.bidCount) ?? 0,
    soldPrice: obj.soldPrice != null ? Number(obj.soldPrice) : null,
    scheduledAt: (obj.scheduledAt as string) || null,
    publishedAt: (obj.publishedAt as string) || null
  }
}

const BID_COLUMNS = ['id', 'itemId', 'bidder', 'bidderId', 'amount', 'createdAt'] as const
const BID_SELECT = BID_COLUMNS.join(', ')

function objToBid(obj: Record<string, unknown>): Bid {
  return {
    id: obj.id as string,
    itemId: obj.itemId as string,
    bidder: obj.bidder as string,
    bidderId: (obj.bidderId as string) || null,
    amount: Number(obj.amount) ?? 0,
    createdAt: obj.createdAt as string
  }
}

function rowToObj(columns: readonly string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => {
    obj[col] = row[i]
  })
  return obj
}

function readItemsFromExec(
  columns: readonly string[],
  result: { columns: string[]; values: unknown[][] }[]
): Item[] {
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map((row) => objToItem(rowToObj(cols, row)))
}

function readBidsFromExec(
  result: { columns: string[]; values: unknown[][] }[]
): Bid[] {
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map((row) => objToBid(rowToObj(cols, row)))
}

function readOneItem(
  db: Database,
  id: string
): Item | undefined {
  const stmt = db.prepare(`SELECT ${ITEM_SELECT} FROM items WHERE id = ?`)
  stmt.bind([id])
  let item: Item | undefined
  if (stmt.step()) {
    item = objToItem(stmt.getAsObject())
  }
  stmt.free()
  return item
}

export const itemService = {
  async activateScheduledItems(): Promise<number> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const stmt = db.prepare(
        `UPDATE items SET status = 'active', publishedAt = COALESCE(publishedAt, scheduledAt), scheduledAt = NULL, updatedAt = ? WHERE status = 'scheduled' AND scheduledAt IS NOT NULL AND scheduledAt <= ?`
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
    let publishedAt: string | null = null
    if (data.scheduledAt) {
      const scheduledTime = dayjs(data.scheduledAt)
      if (scheduledTime.isAfter(dayjs())) {
        status = 'scheduled'
        scheduledAt = data.scheduledAt
      } else {
        publishedAt = now
      }
    } else {
      publishedAt = now
    }

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO items (
          id, ownerId, title, description, story, price, imageUrl,
          emotionTags, category, condition, createdAt, updatedAt, views, likes, status,
          currentPrice, bidCount, soldPrice, scheduledAt, publishedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 0, NULL, ?, ?)`
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
        scheduledAt,
        publishedAt
      ])
      stmt.free()

      return readOneItem(db, id) as Item
    })
  },

  async createDraft(data: ItemDraftCreate): Promise<Item> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    let status: Item['status'] = 'draft'
    let scheduledAt: string | null = null
    let publishedAt: string | null = null
    if (data.scheduledAt) {
      const scheduledTime = dayjs(data.scheduledAt)
      if (scheduledTime.isAfter(dayjs())) {
        status = 'scheduled'
        scheduledAt = data.scheduledAt
      } else {
        publishedAt = now
      }
    }

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO items (
          id, ownerId, title, description, story, price, imageUrl,
          emotionTags, category, condition, createdAt, updatedAt, views, likes, status,
          currentPrice, bidCount, soldPrice, scheduledAt, publishedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 0, NULL, ?, ?)`
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
        scheduledAt,
        publishedAt
      ])
      stmt.free()

      return readOneItem(db, id) as Item
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
        SELECT ${ITEM_SELECT} FROM items ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let data: Item[] = []
      const dataStmt = db.prepare(dataSql)
      dataStmt.bind(values as (string | number)[])
      while (dataStmt.step()) {
        data.push(objToItem(dataStmt.getAsObject()))
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
      const stmt = db.prepare(
        `SELECT ${ITEM_SELECT} FROM items
         INNER JOIN favorites ON items.id = favorites.itemId
         WHERE favorites.userId = ?
         ORDER BY favorites.createdAt DESC
         LIMIT ? OFFSET ?`
      )
      stmt.bind([userId, pageSize, offset])
      const data: Item[] = []
      while (stmt.step()) {
        data.push(objToItem(stmt.getAsObject()))
      }
      stmt.free()

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
        const favStmt = db.prepare(`SELECT id, userId, itemId, createdAt FROM favorites WHERE id = ?`)
        favStmt.bind([id])
        let fav: Favorite | undefined
        if (favStmt.step()) {
          const obj = favStmt.getAsObject()
          fav = {
            id: obj.id as string,
            userId: obj.userId as string,
            itemId: obj.itemId as string,
            createdAt: obj.createdAt as string
          }
        }
        favStmt.free()
        return fav as Favorite
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
      db.run(`UPDATE items SET views = views + 1 WHERE id = ?`, [id])

      const item = readOneItem(db, id)
      if (item) {
        item.views += 1
      }
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
        SELECT ${ITEM_SELECT} FROM items ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let data: Item[] = []
      const dataStmt = db.prepare(dataSql)
      if (values.length > 0) {
        dataStmt.bind(values as (string | number)[])
      }
      while (dataStmt.step()) {
        data.push(objToItem(dataStmt.getAsObject()))
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

  async update(id: string, data: ItemUpdate): Promise<Item | undefined> {
    const now = dayjs().toISOString()
    const updates: string[] = []
    const values: unknown[] = []
    let shouldSetPublishedAt = false

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'scheduledAt' && value !== undefined) {
        const scheduledTime = dayjs(value as string)
        if (scheduledTime.isAfter(dayjs())) {
          updates.push('scheduledAt = ?')
          values.push(value)
          updates.push(`status = 'scheduled'`)
        } else {
          updates.push('scheduledAt = NULL')
          shouldSetPublishedAt = true
          if (!data.status) {
            updates.push(`status = 'active'`)
          }
        }
      } else if (key === 'status' && value !== undefined) {
        if (value === 'active') {
          shouldSetPublishedAt = true
          updates.push('scheduledAt = NULL')
        }
        updates.push(`${key} = ?`)
        values.push(value)
      } else if (value !== undefined) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (data.status === 'active') {
      shouldSetPublishedAt = true
    }

    if (shouldSetPublishedAt) {
      updates.push('publishedAt = COALESCE(publishedAt, ?)')
      values.push(now)
    }

    updates.push('updatedAt = ?')
    values.push(now)
    values.push(id)

    return withDb((db) => {
      const sql = `UPDATE items SET ${updates.join(', ')} WHERE id = ?`
      const stmt = db.prepare(sql)
      stmt.run(values as (string | number)[])
      stmt.free()

      return readOneItem(db, id)
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

    return withDb(async (db) => {
      const item = readOneItem(db, data.itemId)
      if (!item) {
        return { error: '拍品不存在' }
      }

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

      const bidGetStmt = db.prepare(`SELECT ${BID_SELECT} FROM bids WHERE id = ?`)
      bidGetStmt.bind([id])
      let bid: Bid | undefined
      if (bidGetStmt.step()) {
        bid = objToBid(bidGetStmt.getAsObject())
      }
      bidGetStmt.free()

      if (bid && item.ownerId) {
        try {
          await messageService.sendBidAlert(item.ownerId, item.id, item.title, data.bidder, data.amount)
        } catch (e) {
          console.error('[出价提醒] 发送消息失败:', e)
        }
      }

      return bid as Bid
    })
  },

  async getBidsByItemId(itemId: string): Promise<Bid[]> {
    return withDb((db) => {
      const stmt = db.prepare(
        `SELECT ${BID_SELECT} FROM bids WHERE itemId = ? ORDER BY createdAt DESC`
      )
      stmt.bind([itemId])
      const bids: Bid[] = []
      while (stmt.step()) {
        bids.push(objToBid(stmt.getAsObject()))
      }
      stmt.free()
      return bids
    })
  },

  async markAsSold(id: string): Promise<Item | undefined> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const item = readOneItem(db, id)
      if (!item) {
        return undefined
      }
      const soldPrice = item.currentPrice || item.price

      const stmt = db.prepare(
        `UPDATE items SET status = 'sold', soldPrice = ?, scheduledAt = NULL, updatedAt = ? WHERE id = ?`
      )
      stmt.run([soldPrice, now, id])
      stmt.free()

      return readOneItem(db, id)
    })
  },

  async getCalendar(params: CalendarQueryParams): Promise<CalendarData> {
    await this.activateScheduledItems()
    const now = dayjs()
    const year = params.year ?? now.year()
    const month = params.month ?? now.month() + 1
    const { emotionTag } = params

    const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month')
    const endDate = startDate.endOf('month')

    const conditions: string[] = [
      'status IN (\'active\', \'sold\')',
      'COALESCE(publishedAt, scheduledAt, createdAt) >= ?',
      'COALESCE(publishedAt, scheduledAt, createdAt) <= ?'
    ]
    const values: unknown[] = [startDate.toISOString(), endDate.toISOString()]

    if (emotionTag) {
      conditions.push('emotionTags LIKE ?')
      values.push(`%${emotionTag}%`)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    return withDb((db) => {
      const dataSql = `
        SELECT ${ITEM_SELECT} FROM items ${whereClause}
        ORDER BY COALESCE(publishedAt, scheduledAt, createdAt) DESC
      `

      let items: Item[] = []
      const dataStmt = db.prepare(dataSql)
      dataStmt.bind(values as (string | number)[])
      while (dataStmt.step()) {
        items.push(objToItem(dataStmt.getAsObject()))
      }
      dataStmt.free()

      const daysMap = new Map<string, Item[]>()
      items.forEach((item) => {
        const publishDate = item.publishedAt || item.scheduledAt || item.createdAt
        const dateKey = dayjs(publishDate).format('YYYY-MM-DD')
        if (!daysMap.has(dateKey)) {
          daysMap.set(dateKey, [])
        }
        daysMap.get(dateKey)!.push(item)
      })

      const days: CalendarDayItem[] = []
      const daysInMonth = startDate.daysInMonth()
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayItems = daysMap.get(dateKey) || []
        days.push({
          date: dateKey,
          items: dayItems,
          count: dayItems.length
        })
      }

      const emotionTagCounts: Record<string, number> = {}
      EMOTION_TAGS.forEach((tag) => {
        emotionTagCounts[tag] = 0
      })
      items.forEach((item) => {
        const tags = item.emotionTags ? item.emotionTags.split(',').filter(Boolean) : []
        tags.forEach((tag) => {
          if (emotionTagCounts[tag] !== undefined) {
            emotionTagCounts[tag]++
          }
        })
      })

      return {
        year,
        month,
        days,
        totalItems: items.length,
        emotionTagCounts
      }
    })
  }
}
