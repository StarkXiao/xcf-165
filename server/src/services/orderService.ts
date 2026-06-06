import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Order, OrderCreate, OrderQueryParams, PaginatedResponse, OrderStatus, Item } from '../types'
import type { Database } from 'sql.js'
import { messageService } from './messageService'

async function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const result = await fn(db)
  saveDatabase(db)
  return result
}

const ORDER_COLUMNS = [
  'id', 'itemId', 'itemTitle', 'itemImageUrl', 'sellerId', 'buyerId',
  'buyerName', 'buyerPhone', 'buyerAddress', 'price', 'status', 'remark',
  'createdAt', 'updatedAt', 'confirmedAt', 'paidAt', 'shippedAt', 'completedAt', 'cancelledAt'
] as const

const ORDER_SELECT = ORDER_COLUMNS.join(', ')

const ITEM_COLUMNS = [
  'id', 'ownerId', 'title', 'description', 'story', 'price', 'imageUrl',
  'emotionTags', 'category', 'condition', 'createdAt', 'updatedAt',
  'views', 'likes', 'status', 'currentPrice', 'bidCount', 'soldPrice',
  'scheduledAt', 'publishedAt'
] as const

const ITEM_SELECT = ITEM_COLUMNS.join(', ')

function objToOrder(obj: Record<string, unknown>): Order {
  return {
    id: obj.id as string,
    itemId: obj.itemId as string,
    itemTitle: obj.itemTitle as string,
    itemImageUrl: (obj.itemImageUrl as string) || null,
    sellerId: (obj.sellerId as string) || null,
    buyerId: (obj.buyerId as string) || null,
    buyerName: obj.buyerName as string,
    buyerPhone: (obj.buyerPhone as string) || null,
    buyerAddress: (obj.buyerAddress as string) || null,
    price: Number(obj.price) ?? 0,
    status: obj.status as OrderStatus,
    remark: (obj.remark as string) || null,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string,
    confirmedAt: (obj.confirmedAt as string) || null,
    paidAt: (obj.paidAt as string) || null,
    shippedAt: (obj.shippedAt as string) || null,
    completedAt: (obj.completedAt as string) || null,
    cancelledAt: (obj.cancelledAt as string) || null
  }
}

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

function readOneOrder(db: Database, id: string): Order | undefined {
  const stmt = db.prepare(`SELECT ${ORDER_SELECT} FROM orders WHERE id = ?`)
  stmt.bind([id])
  let order: Order | undefined
  if (stmt.step()) {
    order = objToOrder(stmt.getAsObject())
  }
  stmt.free()
  return order
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: []
}

const ACTION_ALLOWED_ROLE: Record<string, ('buyer' | 'seller' | 'either')[]> = {
  'pending→confirmed': ['seller'],
  'pending→cancelled': ['either'],
  'confirmed→paid': ['buyer'],
  'confirmed→cancelled': ['either'],
  'paid→shipped': ['seller'],
  'paid→cancelled': ['seller'],
  'shipped→completed': ['buyer']
}

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false
}

function checkRolePermission(
  order: Order,
  targetStatus: OrderStatus,
  userId: string
): { allowed: boolean; error?: string } {
  const key = `${order.status}→${targetStatus}`
  const allowedRoles = ACTION_ALLOWED_ROLE[key]

  if (!allowedRoles) {
    return { allowed: false, error: `非法的状态流转: ${order.status} → ${targetStatus}` }
  }

  const isBuyer = order.buyerId && order.buyerId === userId
  const isSeller = order.sellerId && order.sellerId === userId

  for (const role of allowedRoles) {
    if (role === 'either' && (isBuyer || isSeller)) {
      return { allowed: true }
    }
    if (role === 'buyer' && isBuyer) {
      return { allowed: true }
    }
    if (role === 'seller' && isSeller) {
      return { allowed: true }
    }
  }

  const roleDesc = allowedRoles
    .map(r => (r === 'either' ? '买家或卖家' : r === 'buyer' ? '买家' : '卖家'))
    .join(' 或 ')
  return {
    allowed: false,
    error: `无权执行此操作，仅${roleDesc}可执行该状态变更`
  }
}

export const orderService = {
  async create(data: OrderCreate, buyerId: string): Promise<Order | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    const result = await withDb(async (db) => {
      const userStmt = db.prepare(`SELECT username, nickname FROM users WHERE id = ?`)
      userStmt.bind([buyerId])
      let buyerNameFromDb = ''
      if (userStmt.step()) {
        const userObj = userStmt.getAsObject() as Record<string, unknown>
        buyerNameFromDb = (userObj.nickname as string) || (userObj.username as string) || ''
      }
      userStmt.free()

      if (!buyerNameFromDb) {
        return { error: '用户信息无效，请重新登录' }
      }

      const itemStmt = db.prepare(`SELECT ${ITEM_SELECT} FROM items WHERE id = ?`)
      itemStmt.bind([data.itemId])
      if (!itemStmt.step()) {
        itemStmt.free()
        return { error: '藏品不存在' }
      }
      const itemObj = itemStmt.getAsObject()
      itemStmt.free()
      const item = objToItem(itemObj)

      if (item.status !== 'active') {
        if (item.status === 'sold' || item.status === 'archived') {
          return { error: '该藏品已成交或已下架，无法下单' }
        }
        if (item.status === 'draft' || item.status === 'scheduled') {
          return { error: '该藏品尚未上架，无法下单' }
        }
        return { error: '该藏品不可下单' }
      }

      if (item.ownerId && item.ownerId === buyerId) {
        return { error: '不能对自己上架的藏品下单' }
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

      const price = item.currentPrice || item.price
      const sellerId = item.ownerId
      const itemTitle = item.title
      const itemImageUrl = item.imageUrl || null
      const finalBuyerName = data.buyerName?.trim() || buyerNameFromDb

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
        buyerId,
        finalBuyerName,
        data.buyerPhone || null,
        data.buyerAddress || null,
        price,
        data.remark || null,
        now,
        now
      ])
      stmt.free()

      const order = readOneOrder(db, id) as Order

      try {
        if (buyerId) {
          await messageService.sendDealNotice(buyerId, 'buyer', data.itemId, itemTitle, id, price, 'pending')
        }
        if (sellerId) {
          await messageService.sendDealNotice(sellerId, 'seller', data.itemId, itemTitle, id, price, 'pending')
        }
      } catch (e) {
        console.error('[订单通知] 发送消息失败:', e)
      }

      return order
    })

    return result
  },

  async getById(id: string): Promise<Order | undefined> {
    return withDb((db) => readOneOrder(db, id))
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
        SELECT ${ORDER_SELECT} FROM orders ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `

      const data: Order[] = []
      const dataStmt = db.prepare(dataSql)
      const bindValues = [...values, pageSize, offset]
      dataStmt.bind(bindValues as (string | number)[])
      while (dataStmt.step()) {
        data.push(objToOrder(dataStmt.getAsObject()))
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

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    userId: string
  ): Promise<Order | { error: string }> {
    const now = dayjs().toISOString()

    const result = await withDb(async (db) => {
      const order = readOneOrder(db, id)
      if (!order) {
        return { error: '订单不存在' }
      }

      if (!canTransition(order.status, newStatus)) {
        return { error: `无法从 ${order.status} 状态变更为 ${newStatus}` }
      }

      const permission = checkRolePermission(order, newStatus, userId)
      if (!permission.allowed) {
        return { error: permission.error || '无权限执行此操作' }
      }

      const timeField = `${newStatus}At`
      const stmt = db.prepare(
        `UPDATE orders SET status = ?, updatedAt = ?, ${timeField} = ? WHERE id = ?`
      )
      stmt.run([newStatus, now, now, id])
      stmt.free()

      const updatedOrder = readOneOrder(db, id) as Order

      try {
        if (order.buyerId) {
          await messageService.sendDealNotice(order.buyerId, 'buyer', order.itemId, order.itemTitle, id, order.price, newStatus)
        }
        if (order.sellerId) {
          await messageService.sendDealNotice(order.sellerId, 'seller', order.itemId, order.itemTitle, id, order.price, newStatus)
        }
      } catch (e) {
        console.error('[订单通知] 发送消息失败:', e)
      }

      return updatedOrder
    })

    return result
  },

  async confirm(id: string, userId: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'confirmed', userId)
  },

  async markPaid(id: string, userId: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'paid', userId)
  },

  async markShipped(id: string, userId: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'shipped', userId)
  },

  async complete(id: string, userId: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'completed', userId)
  },

  async cancel(id: string, userId: string): Promise<Order | { error: string }> {
    return this.updateStatus(id, 'cancelled', userId)
  },

  async getStats(
    userId?: string,
    role: 'buyer' | 'seller' | 'all' = 'all'
  ): Promise<{
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
      const conditions: string[] = []
      const values: (string | number)[] = []

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

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

      const sql = `
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

      return {
        total: (rowObj.total as number) || 0,
        pending: (rowObj.pending as number) || 0,
        confirmed: (rowObj.confirmed as number) || 0,
        paid: (rowObj.paid as number) || 0,
        shipped: (rowObj.shipped as number) || 0,
        completed: (rowObj.completed as number) || 0,
        cancelled: (rowObj.cancelled as number) || 0,
        totalAmount: (rowObj.totalAmount as number) || 0
      }
    })
  }
}
