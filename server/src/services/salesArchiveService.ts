import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type {
  SalesArchive,
  SalesArchiveCreate,
  SalesArchiveUpdate,
  SalesArchiveQueryParams,
  PaginatedResponse,
  SalesArchiveStats
} from '../types'
import type { Database } from 'sql.js'
import { EMOTION_TAGS, CATEGORIES } from '../types'

async function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const result = await fn(db)
  saveDatabase(db)
  return result
}

const ARCHIVE_COLUMNS = [
  'id', 'orderId', 'itemId', 'itemTitle', 'itemImageUrl',
  'sellerId', 'buyerId', 'buyerName', 'destination',
  'finalPrice', 'farewellMessage', 'emotionTags', 'category',
  'archivedAt', 'createdAt', 'updatedAt'
] as const

const ARCHIVE_SELECT = ARCHIVE_COLUMNS.join(', ')

function objToSalesArchive(obj: Record<string, unknown>): SalesArchive {
  return {
    id: obj.id as string,
    orderId: (obj.orderId as string) || null,
    itemId: obj.itemId as string,
    itemTitle: obj.itemTitle as string,
    itemImageUrl: (obj.itemImageUrl as string) || null,
    sellerId: (obj.sellerId as string) || null,
    buyerId: (obj.buyerId as string) || null,
    buyerName: obj.buyerName as string,
    destination: (obj.destination as string) || null,
    finalPrice: Number(obj.finalPrice) ?? 0,
    farewellMessage: (obj.farewellMessage as string) || null,
    emotionTags: (obj.emotionTags as string) || '',
    category: (obj.category as string) || '',
    archivedAt: obj.archivedAt as string,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string
  }
}

function readOneArchive(db: Database, id: string): SalesArchive | undefined {
  const stmt = db.prepare(`SELECT ${ARCHIVE_SELECT} FROM sales_archives WHERE id = ?`)
  stmt.bind([id])
  let archive: SalesArchive | undefined
  if (stmt.step()) {
    archive = objToSalesArchive(stmt.getAsObject())
  }
  stmt.free()
  return archive
}

function getItemInfo(db: Database, itemId: string): {
  title: string
  imageUrl: string | null
  ownerId: string | null
  emotionTags: string
  category: string
  currentPrice: number
  price: number
} | undefined {
  const stmt = db.prepare(
    `SELECT title, imageUrl, ownerId, emotionTags, category, currentPrice, price FROM items WHERE id = ?`
  )
  stmt.bind([itemId])
  let result: ReturnType<typeof getItemInfo> | undefined
  if (stmt.step()) {
    const obj = stmt.getAsObject()
    result = {
      title: obj.title as string,
      imageUrl: (obj.imageUrl as string) || null,
      ownerId: (obj.ownerId as string) || null,
      emotionTags: (obj.emotionTags as string) || '',
      category: (obj.category as string) || '',
      currentPrice: Number(obj.currentPrice) ?? 0,
      price: Number(obj.price) ?? 0
    }
  }
  stmt.free()
  return result
}

function getOrderInfo(db: Database, orderId: string): {
  buyerId: string | null
  buyerName: string
  buyerAddress: string | null
  price: number
  sellerId: string | null
} | undefined {
  const stmt = db.prepare(
    `SELECT buyerId, buyerName, buyerAddress, price, sellerId FROM orders WHERE id = ?`
  )
  stmt.bind([orderId])
  let result: ReturnType<typeof getOrderInfo> | undefined
  if (stmt.step()) {
    const obj = stmt.getAsObject()
    result = {
      buyerId: (obj.buyerId as string) || null,
      buyerName: obj.buyerName as string,
      buyerAddress: (obj.buyerAddress as string) || null,
      price: Number(obj.price) ?? 0,
      sellerId: (obj.sellerId as string) || null
    }
  }
  stmt.free()
  return result
}

export const salesArchiveService = {
  async create(data: SalesArchiveCreate, userId: string): Promise<SalesArchive | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    return withDb(async (db) => {
      const itemInfo = getItemInfo(db, data.itemId)
      if (!itemInfo) {
        return { error: '藏品不存在' }
      }

      if (itemInfo.ownerId && itemInfo.ownerId !== userId) {
        return { error: '只有藏品卖家才能创建成交归档' }
      }

      let finalBuyerName = data.buyerName || '未知买家'
      let finalBuyerId = data.buyerId || null
      let finalDestination = data.destination || null
      let finalPrice = data.finalPrice ?? (itemInfo.currentPrice || itemInfo.price)
      let finalSellerId = data.sellerId || itemInfo.ownerId

      if (data.orderId) {
        const orderInfo = getOrderInfo(db, data.orderId)
        if (orderInfo) {
          finalBuyerName = data.buyerName || orderInfo.buyerName
          finalBuyerId = data.buyerId || orderInfo.buyerId
          finalDestination = data.destination || orderInfo.buyerAddress
          finalPrice = data.finalPrice ?? orderInfo.price
          finalSellerId = data.sellerId || orderInfo.sellerId || finalSellerId
        }
      }

      const stmt = db.prepare(
        `INSERT INTO sales_archives (
          id, orderId, itemId, itemTitle, itemImageUrl,
          sellerId, buyerId, buyerName, destination,
          finalPrice, farewellMessage, emotionTags, category,
          archivedAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      stmt.run([
        id,
        data.orderId || null,
        data.itemId,
        data.itemTitle || itemInfo.title,
        data.itemImageUrl || itemInfo.imageUrl,
        finalSellerId,
        finalBuyerId,
        finalBuyerName,
        finalDestination,
        finalPrice,
        data.farewellMessage || null,
        data.emotionTags || itemInfo.emotionTags,
        data.category || itemInfo.category,
        now,
        now,
        now
      ])
      stmt.free()

      return readOneArchive(db, id) as SalesArchive
    })
  },

  async getById(id: string, userId?: string): Promise<SalesArchive | undefined | { error: string; unauthorized?: boolean }> {
    return withDb((db) => {
      const archive = readOneArchive(db, id)
      if (!archive) {
        return undefined
      }
      if (userId && archive.sellerId && archive.sellerId !== userId) {
        return { error: '无权限查看该归档', unauthorized: true }
      }
      return archive
    })
  },

  async update(
    id: string,
    data: SalesArchiveUpdate,
    userId: string
  ): Promise<SalesArchive | undefined | { error: string; unauthorized?: boolean }> {
    const now = dayjs().toISOString()

    return withDb((db) => {
      const archive = readOneArchive(db, id)
      if (!archive) {
        return undefined
      }
      if (archive.sellerId && archive.sellerId !== userId) {
        return { error: '无权限修改该归档', unauthorized: true }
      }

      const updates: string[] = []
      const values: unknown[] = []

      if (data.destination !== undefined) {
        updates.push('destination = ?')
        values.push(data.destination || null)
      }
      if (data.finalPrice !== undefined) {
        updates.push('finalPrice = ?')
        values.push(data.finalPrice)
      }
      if (data.farewellMessage !== undefined) {
        updates.push('farewellMessage = ?')
        values.push(data.farewellMessage || null)
      }

      if (updates.length === 0) {
        return archive
      }

      updates.push('updatedAt = ?')
      values.push(now, id)

      const stmt = db.prepare(`UPDATE sales_archives SET ${updates.join(', ')} WHERE id = ?`)
      stmt.run(values as (string | number)[])
      stmt.free()

      return readOneArchive(db, id)
    })
  },

  async delete(id: string, userId: string): Promise<boolean | { error: string; unauthorized?: boolean }> {
    return withDb((db) => {
      const archive = readOneArchive(db, id)
      if (!archive) {
        return false
      }
      if (archive.sellerId && archive.sellerId !== userId) {
        return { error: '无权限删除该归档', unauthorized: true }
      }
      db.run(`DELETE FROM sales_archives WHERE id = ?`, [id])
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async list(
    params: SalesArchiveQueryParams,
    userId?: string
  ): Promise<PaginatedResponse<SalesArchive>> {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      category,
      emotionTag,
      startDate,
      endDate,
      minPrice,
      maxPrice
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (userId) {
      conditions.push('sellerId = ?')
      values.push(userId)
    }

    if (keyword) {
      conditions.push('(itemTitle LIKE ? OR buyerName LIKE ? OR destination LIKE ? OR farewellMessage LIKE ?)')
      const pattern = `%${keyword}%`
      values.push(pattern, pattern, pattern, pattern)
    }

    if (category) {
      conditions.push('category = ?')
      values.push(category)
    }

    if (emotionTag) {
      conditions.push('emotionTags LIKE ?')
      values.push(`%${emotionTag}%`)
    }

    if (startDate) {
      conditions.push('archivedAt >= ?')
      values.push(startDate)
    }

    if (endDate) {
      conditions.push('archivedAt <= ?')
      values.push(endDate)
    }

    if (minPrice !== undefined) {
      conditions.push('finalPrice >= ?')
      values.push(minPrice)
    }

    if (maxPrice !== undefined) {
      conditions.push('finalPrice <= ?')
      values.push(maxPrice)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM sales_archives ${whereClause}`
      let total = 0

      if (values.length > 0) {
        const countStmt = db.prepare(countSql)
        countStmt.bind(values as (string | number)[])
        countStmt.step()
        total = countStmt.getAsObject().count as number
        countStmt.free()
      } else {
        const res = db.exec(countSql)
        total = (res[0]?.values[0]?.[0] as number) || 0
      }

      const offset = (page - 1) * pageSize
      const dataSql = `
        SELECT ${ARCHIVE_SELECT} FROM sales_archives ${whereClause}
        ORDER BY archivedAt DESC
        LIMIT ? OFFSET ?
      `

      const data: SalesArchive[] = []
      const dataStmt = db.prepare(dataSql)
      const bindValues = [...values, pageSize, offset]
      dataStmt.bind(bindValues as (string | number)[])
      while (dataStmt.step()) {
        data.push(objToSalesArchive(dataStmt.getAsObject()))
      }
      dataStmt.free()

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  },

  async exportAll(
    params: SalesArchiveQueryParams,
    userId?: string
  ): Promise<SalesArchive[]> {
    const allParams: SalesArchiveQueryParams = { ...params, page: 1, pageSize: 10000 }
    const result = await this.list(allParams, userId)
    return result.data
  },

  async getStats(userId?: string): Promise<SalesArchiveStats> {
    return withDb((db) => {
      const conditions: string[] = []
      const values: (string | number)[] = []

      if (userId) {
        conditions.push('sellerId = ?')
        values.push(userId)
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const sql = `
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(finalPrice), 0) as totalSalesAmount,
          COALESCE(AVG(finalPrice), 0) as averagePrice,
          GROUP_CONCAT(category) as categories,
          GROUP_CONCAT(emotionTags) as emotionTagsConcat
        FROM sales_archives
        ${whereClause}
      `

      let rowObj: Record<string, unknown>
      if (values.length > 0) {
        const stmt = db.prepare(sql)
        stmt.bind(values)
        stmt.step()
        rowObj = stmt.getAsObject()
        stmt.free()
      } else {
        const result = db.exec(sql)
        const cols = result[0].columns
        const row = result[0].values[0]
        rowObj = {}
        cols.forEach((c, i) => { rowObj[c] = row[i] })
      }

      const categoryCounts: Record<string, number> = {}
      const categoriesStr = (rowObj.categories as string) || ''
      categoriesStr.split(',').filter(Boolean).forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
      CATEGORIES.forEach((cat) => {
        if (categoryCounts[cat] === undefined) {
          categoryCounts[cat] = 0
        }
      })

      const emotionTagCounts: Record<string, number> = {}
      const emotionTagsStr = (rowObj.emotionTagsConcat as string) || ''
      emotionTagsStr.split(',').filter(Boolean).forEach((tag) => {
        emotionTagCounts[tag] = (emotionTagCounts[tag] || 0) + 1
      })
      EMOTION_TAGS.forEach((tag) => {
        if (emotionTagCounts[tag] === undefined) {
          emotionTagCounts[tag] = 0
        }
      })

      return {
        total: (rowObj.total as number) || 0,
        totalSalesAmount: (rowObj.totalSalesAmount as number) || 0,
        averagePrice: (rowObj.averagePrice as number) || 0,
        categoryCounts,
        emotionTagCounts
      }
    })
  }
}
