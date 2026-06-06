import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type { Comment, CommentCreate, CommentQueryParams, PaginatedResponse, CommentStatus } from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDatabase()
  const result = fn(db)
  saveDatabase(db)
  return result
}

const COMMENT_COLUMNS = [
  'id', 'itemId', 'userId', 'username', 'parentId',
  'content', 'status', 'createdAt', 'updatedAt'
] as const

const COMMENT_SELECT = COMMENT_COLUMNS.join(', ')

function objToComment(obj: Record<string, unknown>): Comment {
  return {
    id: obj.id as string,
    itemId: obj.itemId as string,
    userId: (obj.userId as string) || null,
    username: obj.username as string,
    parentId: (obj.parentId as string) || null,
    content: obj.content as string,
    status: obj.status as CommentStatus,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string
  }
}

function rowToObj(columns: readonly string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => {
    obj[col] = row[i]
  })
  return obj
}

function readOneComment(db: Database, id: string): Comment | undefined {
  const stmt = db.prepare(`SELECT ${COMMENT_SELECT} FROM comments WHERE id = ?`)
  stmt.bind([id])
  let comment: Comment | undefined
  if (stmt.step()) {
    comment = objToComment(stmt.getAsObject())
  }
  stmt.free()
  return comment
}

function readCommentsFromExec(
  result: { columns: string[]; values: unknown[][] }[]
): Comment[] {
  if (result.length === 0) return []
  const cols = result[0].columns
  return result[0].values.map((row) => objToComment(rowToObj(cols, row)))
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>()
  const roots: Comment[] = []

  comments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] })
  })

  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(c)
    } else {
      roots.push(c)
    }
  })

  const sortByTime = (a: Comment, b: Comment) =>
    dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()

  roots.sort(sortByTime)
  roots.forEach((root) => {
    root.replies?.sort(sortByTime)
  })

  return roots
}

function getItemOwnerId(db: Database, itemId: string): string | null {
  const stmt = db.prepare(`SELECT ownerId FROM items WHERE id = ?`)
  stmt.bind([itemId])
  let ownerId: string | null = null
  if (stmt.step()) {
    ownerId = (stmt.getAsObject().ownerId as string) || null
  }
  stmt.free()
  return ownerId
}

function getCommentItemOwnerId(db: Database, commentId: string): string | null {
  const stmt = db.prepare(`
    SELECT i.ownerId
    FROM comments c
    LEFT JOIN items i ON c.itemId = i.id
    WHERE c.id = ?
  `)
  stmt.bind([commentId])
  let ownerId: string | null = null
  if (stmt.step()) {
    ownerId = (stmt.getAsObject().ownerId as string) || null
  }
  stmt.free()
  return ownerId
}

export const commentService = {
  async isItemOwner(itemId: string, userId: string): Promise<boolean> {
    return withDb((db) => {
      return getItemOwnerId(db, itemId) === userId
    })
  },

  async isCommentItemOwner(commentId: string, userId: string): Promise<boolean> {
    return withDb((db) => {
      return getCommentItemOwnerId(db, commentId) === userId
    })
  },

  async create(data: CommentCreate, userId?: string): Promise<Comment | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    if (!data.content.trim()) {
      return { error: '留言内容不能为空' }
    }

    if (data.content.length > 500) {
      return { error: '留言内容不能超过500字' }
    }

    return withDb((db) => {
      if (data.parentId) {
        const parent = readOneComment(db, data.parentId)
        if (!parent) {
          return { error: '回复的留言不存在' }
        }
        if (parent.parentId) {
          return { error: '只能对留言进行回复，不能对回复进行回复' }
        }
        if (!userId) {
          return { error: '请先登录后再回复' }
        }
        const ownerId = getItemOwnerId(db, data.itemId)
        if (ownerId !== userId) {
          return { error: '只有藏品卖家才能回复买家留言' }
        }
      }

      const username = data.username?.trim() || '匿名用户'
      const status = data.parentId ? 'approved' : 'pending'

      const stmt = db.prepare(
        `INSERT INTO comments (
          id, itemId, userId, username, parentId, content, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      stmt.run([
        id,
        data.itemId,
        userId || null,
        username,
        data.parentId || null,
        data.content.trim(),
        status,
        now,
        now
      ])
      stmt.free()

      return readOneComment(db, id) as Comment
    })
  },

  async getByItemId(itemId: string): Promise<Comment[]> {
    return withDb((db) => {
      const stmt = db.prepare(
        `SELECT ${COMMENT_SELECT} FROM comments WHERE itemId = ? AND status = 'approved' ORDER BY createdAt ASC`
      )
      stmt.bind([itemId])
      const comments: Comment[] = []
      while (stmt.step()) {
        comments.push(objToComment(stmt.getAsObject()))
      }
      stmt.free()
      return buildCommentTree(comments)
    })
  },

  async list(params: CommentQueryParams, ownerId?: string): Promise<PaginatedResponse<Comment>> {
    const {
      page = 1,
      pageSize = 20,
      status,
      itemId,
      keyword
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (ownerId) {
      conditions.push('itemId IN (SELECT id FROM items WHERE ownerId = ?)')
      values.push(ownerId)
    }

    if (status && status !== 'all') {
      conditions.push('status = ?')
      values.push(status)
    }

    if (itemId) {
      conditions.push('itemId = ?')
      values.push(itemId)
    }

    if (keyword) {
      conditions.push('(content LIKE ? OR username LIKE ?)')
      const pattern = `%${keyword}%`
      values.push(pattern, pattern)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM comments ${whereClause}`
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
        SELECT ${COMMENT_SELECT} FROM comments ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let comments: Comment[] = []
      const dataStmt = db.prepare(dataSql)
      if (values.length > 0) {
        dataStmt.bind(values as (string | number)[])
      }
      while (dataStmt.step()) {
        comments.push(objToComment(dataStmt.getAsObject()))
      }
      dataStmt.free()

      return {
        data: comments,
        total: countResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.count / pageSize)
      }
    })
  },

  async approve(id: string, userId: string): Promise<Comment | undefined | { error: string; unauthorized?: boolean }> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const comment = readOneComment(db, id)
      if (!comment) {
        return { error: '留言不存在' }
      }
      const ownerId = getCommentItemOwnerId(db, id)
      if (ownerId !== userId) {
        return { error: '只有藏品卖家才能审核留言', unauthorized: true }
      }

      const stmt = db.prepare(`UPDATE comments SET status = 'approved', updatedAt = ? WHERE id = ?`)
      stmt.run([now, id])
      stmt.free()

      return readOneComment(db, id)
    })
  },

  async reject(id: string, userId: string): Promise<Comment | undefined | { error: string; unauthorized?: boolean }> {
    const now = dayjs().toISOString()
    return withDb((db) => {
      const comment = readOneComment(db, id)
      if (!comment) {
        return { error: '留言不存在' }
      }
      const ownerId = getCommentItemOwnerId(db, id)
      if (ownerId !== userId) {
        return { error: '只有藏品卖家才能拒绝留言', unauthorized: true }
      }

      const stmt = db.prepare(`UPDATE comments SET status = 'rejected', updatedAt = ? WHERE id = ?`)
      stmt.run([now, id])
      stmt.free()

      return readOneComment(db, id)
    })
  },

  async delete(id: string, userId: string): Promise<boolean | { error: string; unauthorized?: boolean }> {
    return withDb((db) => {
      const comment = readOneComment(db, id)
      if (!comment) {
        return false
      }
      const ownerId = getCommentItemOwnerId(db, id)
      if (ownerId !== userId) {
        return { error: '只有藏品卖家才能删除留言', unauthorized: true }
      }
      db.run(`DELETE FROM comments WHERE id = ? OR parentId = ?`, [id, id])
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async getStats(ownerId?: string): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
  }> {
    return withDb((db) => {
      let sql = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM comments
      `
      const values: unknown[] = []
      if (ownerId) {
        sql += ` WHERE itemId IN (SELECT id FROM items WHERE ownerId = ?)`
        values.push(ownerId)
      }
      let row: unknown[]
      if (values.length > 0) {
        const stmt = db.prepare(sql)
        stmt.bind(values as (string | number)[])
        stmt.step()
        const obj = stmt.getAsObject()
        row = [obj.total, obj.pending, obj.approved, obj.rejected]
        stmt.free()
      } else {
        const result = db.exec(sql)
        row = result[0].values[0]
      }
      return {
        total: (row[0] as number) || 0,
        pending: (row[1] as number) || 0,
        approved: (row[2] as number) || 0,
        rejected: (row[3] as number) || 0
      }
    })
  },

  async getItemInfoByCommentId(id: string): Promise<{ itemId: string; itemTitle: string } | undefined> {
    return withDb((db) => {
      const stmt = db.prepare(`
        SELECT c.itemId, i.title as itemTitle
        FROM comments c
        LEFT JOIN items i ON c.itemId = i.id
        WHERE c.id = ?
      `)
      stmt.bind([id])
      let result: { itemId: string; itemTitle: string } | undefined
      if (stmt.step()) {
        const obj = stmt.getAsObject()
        result = {
          itemId: obj.itemId as string,
          itemTitle: (obj.itemTitle as string) || '已删除的藏品'
        }
      }
      stmt.free()
      return result
    })
  }
}
