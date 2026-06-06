import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Message, MessageCreate, MessageQueryParams, PaginatedResponse, MessageType, MessageStats } from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDatabase()
  const result = fn(db)
  saveDatabase(db)
  return result
}

const MESSAGE_COLUMNS = [
  'id', 'userId', 'type', 'title', 'content', 'data',
  'isRead', 'relatedId', 'relatedType', 'createdAt', 'readAt'
] as const

const MESSAGE_SELECT = MESSAGE_COLUMNS.join(', ')

function objToMessage(obj: Record<string, unknown>): Message {
  return {
    id: obj.id as string,
    userId: obj.userId as string,
    type: obj.type as MessageType,
    title: obj.title as string,
    content: obj.content as string,
    data: (obj.data as string) || null,
    isRead: Boolean(obj.isRead),
    relatedId: (obj.relatedId as string) || null,
    relatedType: (obj.relatedType as string) || null,
    createdAt: obj.createdAt as string,
    readAt: (obj.readAt as string) || null
  }
}

function readOneMessage(db: Database, id: string): Message | undefined {
  const stmt = db.prepare(`SELECT ${MESSAGE_SELECT} FROM messages WHERE id = ?`)
  stmt.bind([id])
  let message: Message | undefined
  if (stmt.step()) {
    message = objToMessage(stmt.getAsObject())
  }
  stmt.free()
  return message
}

export const messageService = {
  async create(data: MessageCreate): Promise<Message> {
    const now = dayjs().toISOString()
    const id = uuidv4()
    const dataJson = data.data ? JSON.stringify(data.data) : null

    return withDb((db) => {
      const stmt = db.prepare(
        `INSERT INTO messages (
          id, userId, type, title, content, data,
          isRead, relatedId, relatedType, createdAt, readAt
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`
      )
      stmt.run([
        id,
        data.userId,
        data.type,
        data.title,
        data.content,
        dataJson,
        data.relatedId || null,
        data.relatedType || null,
        now
      ])
      stmt.free()

      return readOneMessage(db, id) as Message
    })
  },

  async createMany(messages: MessageCreate[]): Promise<Message[]> {
    if (messages.length === 0) return []
    const now = dayjs().toISOString()

    return withDb((db) => {
      const created: Message[] = []
      const stmt = db.prepare(
        `INSERT INTO messages (
          id, userId, type, title, content, data,
          isRead, relatedId, relatedType, createdAt, readAt
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`
      )

      for (const data of messages) {
        const id = uuidv4()
        const dataJson = data.data ? JSON.stringify(data.data) : null
        stmt.run([
          id,
          data.userId,
          data.type,
          data.title,
          data.content,
          dataJson,
          data.relatedId || null,
          data.relatedType || null,
          now
        ])
        const msg = readOneMessage(db, id)
        if (msg) created.push(msg)
      }

      stmt.free()
      return created
    })
  },

  async list(params: MessageQueryParams, userId: string): Promise<PaginatedResponse<Message>> {
    const {
      page = 1,
      pageSize = 20,
      type = 'all',
      isRead = 'all'
    } = params

    const conditions: string[] = ['userId = ?']
    const values: unknown[] = [userId]

    if (type !== 'all') {
      conditions.push('type = ?')
      values.push(type)
    }

    if (isRead !== 'all') {
      conditions.push('isRead = ?')
      values.push(isRead ? 1 : 0)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM messages ${whereClause}`
      let total = 0

      const countStmt = db.prepare(countSql)
      countStmt.bind(values as (string | number)[])
      countStmt.step()
      total = countStmt.getAsObject().count as number
      countStmt.free()

      const offset = (page - 1) * pageSize
      const dataSql = `
        SELECT ${MESSAGE_SELECT} FROM messages ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `

      const data: Message[] = []
      const dataStmt = db.prepare(dataSql)
      const bindValues = [...values, pageSize, offset]
      dataStmt.bind(bindValues as (string | number)[])
      while (dataStmt.step()) {
        data.push(objToMessage(dataStmt.getAsObject()))
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

  async getById(id: string, userId: string): Promise<Message | undefined> {
    return withDb((db) => {
      const stmt = db.prepare(`SELECT ${MESSAGE_SELECT} FROM messages WHERE id = ? AND userId = ?`)
      stmt.bind([id, userId])
      let message: Message | undefined
      if (stmt.step()) {
        message = objToMessage(stmt.getAsObject())
      }
      stmt.free()
      return message
    })
  },

  async markAsRead(id: string, userId: string): Promise<Message | undefined | { error: string }> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const stmt = db.prepare(`SELECT ${MESSAGE_SELECT} FROM messages WHERE id = ? AND userId = ?`)
      stmt.bind([id, userId])
      if (!stmt.step()) {
        stmt.free()
        return { error: '消息不存在' }
      }
      stmt.free()

      const updateStmt = db.prepare(`UPDATE messages SET isRead = 1, readAt = ? WHERE id = ?`)
      updateStmt.run([now, id])
      updateStmt.free()

      return readOneMessage(db, id)
    })
  },

  async markAllAsRead(userId: string): Promise<number> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const stmt = db.prepare(`UPDATE messages SET isRead = 1, readAt = ? WHERE userId = ? AND isRead = 0`)
      stmt.run([now, userId])
      stmt.free()
      const result = db.exec(`SELECT changes() as cnt`)
      return (result[0]?.values[0]?.[0] as number) || 0
    })
  },

  async delete(id: string, userId: string): Promise<boolean | { error: string }> {
    return withDb((db) => {
      const checkStmt = db.prepare(`SELECT id FROM messages WHERE id = ? AND userId = ?`)
      checkStmt.bind([id, userId])
      if (!checkStmt.step()) {
        checkStmt.free()
        return { error: '消息不存在' }
      }
      checkStmt.free()

      db.run(`DELETE FROM messages WHERE id = ?`, [id])
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async clearAll(userId: string): Promise<number> {
    return withDb((db) => {
      db.run(`DELETE FROM messages WHERE userId = ?`, [userId])
      const result = db.exec(`SELECT changes() as cnt`)
      return (result[0]?.values[0]?.[0] as number) || 0
    })
  },

  async getStats(userId: string): Promise<MessageStats> {
    return withDb((db) => {
      const sql = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN type = 'bid_alert' THEN 1 ELSE 0 END) as bidAlert,
          SUM(CASE WHEN type = 'deal_notice' THEN 1 ELSE 0 END) as dealNotice,
          SUM(CASE WHEN type = 'review_result' THEN 1 ELSE 0 END) as reviewResult,
          SUM(CASE WHEN type = 'system_announcement' THEN 1 ELSE 0 END) as systemAnnouncement,
          SUM(CASE WHEN type = 'bid_alert' AND isRead = 0 THEN 1 ELSE 0 END) as unreadBidAlert,
          SUM(CASE WHEN type = 'deal_notice' AND isRead = 0 THEN 1 ELSE 0 END) as unreadDealNotice,
          SUM(CASE WHEN type = 'review_result' AND isRead = 0 THEN 1 ELSE 0 END) as unreadReviewResult,
          SUM(CASE WHEN type = 'system_announcement' AND isRead = 0 THEN 1 ELSE 0 END) as unreadSystemAnnouncement
        FROM messages
        WHERE userId = ?
      `
      const stmt = db.prepare(sql)
      stmt.bind([userId])
      stmt.step()
      const obj = stmt.getAsObject()
      stmt.free()

      return {
        total: (obj.total as number) || 0,
        unread: (obj.unread as number) || 0,
        bidAlert: (obj.bidAlert as number) || 0,
        dealNotice: (obj.dealNotice as number) || 0,
        reviewResult: (obj.reviewResult as number) || 0,
        systemAnnouncement: (obj.systemAnnouncement as number) || 0,
        unreadBidAlert: (obj.unreadBidAlert as number) || 0,
        unreadDealNotice: (obj.unreadDealNotice as number) || 0,
        unreadReviewResult: (obj.unreadReviewResult as number) || 0,
        unreadSystemAnnouncement: (obj.unreadSystemAnnouncement as number) || 0
      }
    })
  },

  async sendBidAlert(ownerId: string, itemId: string, itemTitle: string, bidderName: string, amount: number): Promise<Message> {
    return this.create({
      userId: ownerId,
      type: 'bid_alert',
      title: '新的出价提醒',
      content: `您的藏品「${itemTitle}」收到了来自 ${bidderName} 的新出价，金额为 ¥${amount}`,
      data: { itemId, itemTitle, bidderName, amount },
      relatedId: itemId,
      relatedType: 'item'
    })
  },

  async sendDealNotice(userId: string, role: 'buyer' | 'seller', itemId: string, itemTitle: string, orderId: string, price: number, status: string): Promise<Message> {
    const roleText = role === 'buyer' ? '您购买的' : '您出售的'
    const title = `订单${status === 'completed' ? '已完成' : status === 'cancelled' ? '已取消' : '状态更新'}`
    return this.create({
      userId,
      type: 'deal_notice',
      title,
      content: `${roleText}藏品「${itemTitle}」订单${status === 'completed' ? '已完成' : status === 'cancelled' ? '已取消' : `状态已更新为「${status}」`}，金额为 ¥${price}`,
      data: { itemId, itemTitle, orderId, price, status, role },
      relatedId: orderId,
      relatedType: 'order'
    })
  },

  async sendReviewResult(userId: string, itemId: string, itemTitle: string, approved: boolean, reason?: string): Promise<Message> {
    return this.create({
      userId,
      type: 'review_result',
      title: approved ? '审核通过' : '审核未通过',
      content: approved
        ? `您的藏品「${itemTitle}」已通过审核，已成功上架`
        : `您的藏品「${itemTitle}」未通过审核${reason ? `，原因：${reason}` : ''}`,
      data: { itemId, itemTitle, approved, reason },
      relatedId: itemId,
      relatedType: 'item'
    })
  },

  async sendSystemAnnouncement(userId: string, title: string, content: string, data?: Record<string, unknown>): Promise<Message> {
    return this.create({
      userId,
      type: 'system_announcement',
      title,
      content,
      data,
      relatedType: 'system'
    })
  },

  async broadcastSystemAnnouncement(title: string, content: string, data?: Record<string, unknown>): Promise<Message[]> {
    return withDb(async (db) => {
      const userStmt = db.prepare(`SELECT id FROM users`)
      const userIds: string[] = []
      while (userStmt.step()) {
        userIds.push(userStmt.getAsObject().id as string)
      }
      userStmt.free()

      if (userIds.length === 0) return []

      const messages: MessageCreate[] = userIds.map(userId => ({
        userId,
        type: 'system_announcement',
        title,
        content,
        data,
        relatedType: 'system'
      }))

      return this.createMany(messages)
    })
  },

  async sendCommentReviewResult(userId: string, commentId: string, itemId: string, itemTitle: string, approved: boolean, rejectReason?: string): Promise<Message> {
    return this.create({
      userId,
      type: 'review_result',
      title: approved ? '留言审核通过' : '留言未通过审核',
      content: approved
        ? `您在藏品「${itemTitle}」的留言已通过审核`
        : `您在藏品「${itemTitle}」的留言未通过审核${rejectReason ? `，原因：${rejectReason}` : ''}`,
      data: { commentId, itemId, itemTitle, approved, rejectReason },
      relatedId: commentId,
      relatedType: 'comment'
    })
  }
}
