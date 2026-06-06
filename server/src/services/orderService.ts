import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Order, OrderCreate, OrderQueryParams, PaginatedResponse, OrderStatus } from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDatabase()
  const result = fn(db)
  saveDatabase(db)
  return result
}

function rowToOrder(row: unknown[]): Order {
  return {
    id: row[0] as string,
    itemId: row[1] as string,
    itemTitle: row[2] as string,
    itemImageUrl: (row[3] as string) || null,
    sellerId: (row[4] as string) || null,
    buyerId: (row[5] as string) || null,
    buyerName: row[6] as string,
    buyerPhone: (row[7] as string) || null,
    buyerAddress: (row[8] as string) || null,
    price: row[9] as number,
    status: row[10] as OrderStatus,
    remark: (row[11] as string) || null,
    createdAt: row[12] as string,
    updatedAt: row[13] as string,
    confirmedAt: (row[14] as string) || null,
    paidAt: (row[15] as string) || null,
    shippedAt: (row[16] as string) || null,
    completedAt: (row[17] as string) || null,
    cancelledAt: (row[18] as string) || null
  }
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: []
}

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false
}

export const orderService = {
  async create(data: OrderCreate, buyerId?: string): Promise<Order | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    return withDb((db) => {
      const itemStmt = db.prepare(`SELECT * FROM items WHERE id = ?`)
      itemStmt.bind([data.itemId])
      if (!itemStmt.step()) {
        itemStmt.free()
        return { error: '藏品不存在' }
      }
      const itemObj = itemStmt.getAsObject() as Record<string, unknown>
      itemStmt.free()

      const itemStatus = itemObj.status as string
      if (itemStatus !== 'active' && itemStatus !== 'sold') {
        return { error: '该藏品不可下单' }
      }

      const pendingStmt = db.prepare(
        `SELECT COUNT(*) as cnt FROM orders WHERE itemId = ? AND status IN ('pending', 'confirmed', 'paid', 'shipped')`
      )
      pendingStmt.bind([data.itemId])
      pendingStmt.step()
      const pendingCount = (pendingStmt.getAsObject().cnt as number) || 0
      pendingStmt.free()

      if (pendingCount > 0) {
        return { error: '该藏品已有进行中的订单' }
      }

      const price = ((itemObj.currentPrice as number) || (itemObj.price as number)) as number
      const sellerId = (itemObj.ownerId as string) || null
      const itemTitle = itemObj.title as string
      const itemImageUrl = (itemObj.imageUrl as string) || null

      const stmt = db.prepare(
        `INSERT INTO orders (
          id, itemId, itemTitle, itemImageUrl, sellerId, buyerId,
          buyerName, buyerPhone, buyerAddress, price, status, remark,
          createdAt, updatedAt, confirmedAt, paidAt, shippedAt, completedAt, cancelledAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL, NULL, NULL, NULL, NULL)`
      )
      stmt.run([
        id,
        data.itemId,
        itemTitle,
        itemImageUrl,
        sellerId,
        buyerId || null,
        data.buyerName,
        data.buyerPhone || null,
        data.buyerAddress || null,
        price,
        data.remark || null,
        now,
        now
      ])
      stmt.free()

      const result = db.exec(`SELECT * FROM orders WHERE id = '${id}'`)
      return rowToOrder(result[0].values[0])
    })
  },

  async getById(id: string): Promise<Order | undefined> {
    return withDb((db) => {
      const result = db.exec(`SELECT * FROM orders WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return undefined
      }
      return rowToOrder(result[0].values[0])
    })
  },

  async list(params: OrderQueryParams, userId?: string): Promise<PaginatedResponse<Order>> {
    const {
      page = 1,
      pageSize = 10,
      status,
      keyword,
      role = 'all'
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (userId) {
      if (role === 'buyer') {
        conditions.push('buyerId = ?')
        values.push(userId)
      } else if (role === 'seller') {
        conditions.push('sellerId = ?')
        values.push(userId)
      } else {
        conditions.push('(buyerId = ? OR sellerId = ?)')
        values.push(userId, userId)
      }
    }

    if (status) {
      conditions.push('status = ?')
      values.push(status)
    }

    if (keyword) {
      conditions.push('(itemTitle LIKE ? OR buyerName LIKE ?)')
      const keywordPattern = `%${keyword}%`
      values.push(keywordPattern, keywordPattern)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM orders ${whereClause}`
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
        SELECT * FROM orders ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let data: Order[] = []
      if (values.length > 0) {
        const dataStmt = db.prepare(dataSql)
        dataStmt.bind(values as (string | number)[])
        while (dataStmt.step()) {
          data.push(rowToOrder(dataStmt.get()))
        }
        dataStmt.free()
      } else {
        const res = db.exec(dataSql)
        if (res.length > 0) {
          data = res[0].values.map(rowToOrder)
        }
      }

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  },

  async updateStatus(id: string, newStatus: OrderStatus): Promise<Order | { error: string }> {
    const now = dayjs().toISOString()

    return withDb((db) => {
      const result = db.exec(`SELECT * FROM orders WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return { error: '订单不存在' }
      }
      const order = rowToOrder(result[0].values[0])

      if (!canTransition(order.status, newStatus)) {
        return { error: `无法从 ${order.status} 状态变更为 ${newStatus}` }
      }

      const timeField = `${newStatus}At`
      const stmt = db.prepare(
        `UPDATE orders SET status = ?, updatedAt = ?, ${timeField} = ? WHERE id = ?`
      )
      stmt.run([newStatus, now, now, id])
      stmt.free()

      const updatedResult = db.exec(`SELECT * FROM orders WHERE id = '${id}'`)
      return rowToOrder(updatedResult[0].values[0])
    })
  },

  async confirm(id: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'confirmed')
  },

  async markPaid(id: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'paid')
  },

  async markShipped(id: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'shipped')
  },

  async complete(id: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'completed')
  },

  async cancel(id: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'cancelled')
  },

  async getStats(): Promise<{
    total: number
    pending: number
    confirmed: number
    paid: number
    shipped: number
    completed: number
    cancelled: number
    totalAmount: number
  }> {
    return withDb((db) => {
      const result = db.exec(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as totalAmount
        FROM orders
      `)
      const row = result[0].values[0]
      return {
        total: (row[0] as number) || 0,
        pending: (row[1] as number) || 0,
        confirmed: (row[2] as number) || 0,
        paid: (row[3] as number) || 0,
        shipped: (row[4] as number) || 0,
        completed: (row[5] as number) || 0,
        cancelled: (row[6] as number) || 0,
        totalAmount: (row[7] as number) || 0
      }
    })
  }
}
