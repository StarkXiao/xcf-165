import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { getDatabase, saveDatabase } from '../database'
import type {
  SensitiveWord, SensitiveWordCreate, SensitiveWordUpdate, SensitiveWordQueryParams,
  SensitiveWordMatch, ContentCheckResult,
  ReviewRecord, ReviewRecordCreate, ReviewRecordQueryParams,
  RejectReasonTemplate, RejectReasonTemplateCreate, RejectReasonTemplateUpdate,
  PaginatedResponse, ModerationStats
} from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  const result = await fn(db)
  saveDatabase(db)
  return result
}

const SENSITIVE_WORD_COLUMNS = [
  'id', 'word', 'category', 'level', 'createdAt', 'updatedAt'
] as const

const REVIEW_RECORD_COLUMNS = [
  'id', 'targetId', 'targetType', 'reviewerId', 'reviewerName',
  'action', 'rejectReason', 'rejectReasonId', 'beforeStatus',
  'afterStatus', 'remark', 'createdAt'
] as const

const REJECT_REASON_COLUMNS = [
  'id', 'title', 'description', 'category', 'isDefault',
  'sortOrder', 'createdAt', 'updatedAt'
] as const

function rowToObj(columns: readonly string[], row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  columns.forEach((col, i) => {
    obj[col] = row[i]
  })
  return obj
}

function objToSensitiveWord(obj: Record<string, unknown>): SensitiveWord {
  return {
    id: obj.id as string,
    word: obj.word as string,
    category: obj.category as SensitiveWord['category'],
    level: obj.level as SensitiveWord['level'],
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string
  }
}

function objToReviewRecord(obj: Record<string, unknown>): ReviewRecord {
  return {
    id: obj.id as string,
    targetId: obj.targetId as string,
    targetType: obj.targetType as ReviewRecord['targetType'],
    reviewerId: obj.reviewerId as string,
    reviewerName: obj.reviewerName as string,
    action: obj.action as ReviewRecord['action'],
    rejectReason: (obj.rejectReason as string) || null,
    rejectReasonId: (obj.rejectReasonId as string) || null,
    beforeStatus: obj.beforeStatus as string,
    afterStatus: obj.afterStatus as string,
    remark: (obj.remark as string) || null,
    createdAt: obj.createdAt as string
  }
}

function objToRejectReasonTemplate(obj: Record<string, unknown>): RejectReasonTemplate {
  return {
    id: obj.id as string,
    title: obj.title as string,
    description: obj.description as string,
    category: obj.category as string,
    isDefault: Boolean(obj.isDefault),
    sortOrder: obj.sortOrder as number,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string
  }
}

export const moderationService = {
  async checkContent(content: string): Promise<ContentCheckResult> {
    return withDb((db) => {
      const stmt = db.prepare(`SELECT word, category, level FROM sensitive_words`)
      const words: { word: string; category: string; level: string }[] = []
      while (stmt.step()) {
        const obj = stmt.getAsObject()
        words.push({
          word: obj.word as string,
          category: obj.category as string,
          level: obj.level as string
        })
      }
      stmt.free()

      const matches: SensitiveWordMatch[] = []
      let highestLevel: 'none' | 'low' | 'medium' | 'high' = 'none'
      const levelOrder = { none: 0, low: 1, medium: 2, high: 3 }

      for (const sw of words) {
        let startIndex = 0
        while (startIndex < content.length) {
          const idx = content.indexOf(sw.word, startIndex)
          if (idx === -1) break
          matches.push({
            word: sw.word,
            category: sw.category as SensitiveWordMatch['category'],
            level: sw.level as SensitiveWordMatch['level'],
            start: idx,
            end: idx + sw.word.length
          })
          if (levelOrder[sw.level as keyof typeof levelOrder] > levelOrder[highestLevel]) {
            highestLevel = sw.level as 'low' | 'medium' | 'high'
          }
          startIndex = idx + sw.word.length
        }
      }

      let suggestedAction: 'pass' | 'review' | 'block' = 'pass'
      if (matches.length > 0) {
        if (highestLevel === 'high') {
          suggestedAction = 'block'
        } else if (highestLevel === 'medium' || matches.length >= 2) {
          suggestedAction = 'review'
        } else {
          suggestedAction = 'review'
        }
      }

      return {
        passed: matches.length === 0,
        matches,
        highestLevel,
        suggestedAction
      }
    })
  },

  async listSensitiveWords(params: SensitiveWordQueryParams): Promise<PaginatedResponse<SensitiveWord>> {
    const {
      page = 1,
      pageSize = 20,
      category,
      level,
      keyword
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (category && category !== 'all') {
      conditions.push('category = ?')
      values.push(category)
    }
    if (level && level !== 'all') {
      conditions.push('level = ?')
      values.push(level)
    }
    if (keyword) {
      conditions.push('word LIKE ?')
      values.push(`%${keyword}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const swSelect = SENSITIVE_WORD_COLUMNS.join(', ')

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM sensitive_words ${whereClause}`
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
        SELECT ${swSelect} FROM sensitive_words ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let words: SensitiveWord[] = []
      const dataStmt = db.prepare(dataSql)
      if (values.length > 0) {
        dataStmt.bind(values as (string | number)[])
      }
      while (dataStmt.step()) {
        words.push(objToSensitiveWord(dataStmt.getAsObject()))
      }
      dataStmt.free()

      return {
        data: words,
        total: countResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.count / pageSize)
      }
    })
  },

  async getSensitiveWordById(id: string): Promise<SensitiveWord | undefined> {
    return withDb((db) => {
      const stmt = db.prepare(`SELECT ${SENSITIVE_WORD_COLUMNS.join(', ')} FROM sensitive_words WHERE id = ?`)
      stmt.bind([id])
      let word: SensitiveWord | undefined
      if (stmt.step()) {
        word = objToSensitiveWord(stmt.getAsObject())
      }
      stmt.free()
      return word
    })
  },

  async createSensitiveWord(data: SensitiveWordCreate): Promise<SensitiveWord | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    if (!data.word.trim()) {
      return { error: '敏感词不能为空' }
    }

    return withDb((db) => {
      const checkStmt = db.prepare(`SELECT id FROM sensitive_words WHERE word = ?`)
      checkStmt.bind([data.word.trim()])
      if (checkStmt.step()) {
        checkStmt.free()
        return { error: '该敏感词已存在' }
      }
      checkStmt.free()

      const stmt = db.prepare(`
        INSERT INTO sensitive_words (id, word, category, level, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      stmt.run([
        id,
        data.word.trim(),
        data.category,
        data.level || 'medium',
        now,
        now
      ])
      stmt.free()

      const resultStmt = db.prepare(`SELECT ${SENSITIVE_WORD_COLUMNS.join(', ')} FROM sensitive_words WHERE id = ?`)
      resultStmt.bind([id])
      let word: SensitiveWord | undefined
      if (resultStmt.step()) {
        word = objToSensitiveWord(resultStmt.getAsObject())
      }
      resultStmt.free()
      return word as SensitiveWord
    })
  },

  async updateSensitiveWord(id: string, data: SensitiveWordUpdate): Promise<SensitiveWord | undefined | { error: string }> {
    const now = dayjs().toISOString()

    return withDb((db) => {
      const checkStmt = db.prepare(`SELECT id FROM sensitive_words WHERE id = ?`)
      checkStmt.bind([id])
      if (!checkStmt.step()) {
        checkStmt.free()
        return undefined
      }
      checkStmt.free()

      if (data.word) {
        const dupStmt = db.prepare(`SELECT id FROM sensitive_words WHERE word = ? AND id != ?`)
        dupStmt.bind([data.word.trim(), id])
        if (dupStmt.step()) {
          dupStmt.free()
          return { error: '该敏感词已存在' }
        }
        dupStmt.free()
      }

      const fields: string[] = []
      const values: unknown[] = []

      if (data.word !== undefined) {
        fields.push('word = ?')
        values.push(data.word.trim())
      }
      if (data.category !== undefined) {
        fields.push('category = ?')
        values.push(data.category)
      }
      if (data.level !== undefined) {
        fields.push('level = ?')
        values.push(data.level)
      }
      fields.push('updatedAt = ?')
      values.push(now)
      values.push(id)

      const stmt = db.prepare(`UPDATE sensitive_words SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(values as (string | number)[])
      stmt.free()

      const resultStmt = db.prepare(`SELECT ${SENSITIVE_WORD_COLUMNS.join(', ')} FROM sensitive_words WHERE id = ?`)
      resultStmt.bind([id])
      let word: SensitiveWord | undefined
      if (resultStmt.step()) {
        word = objToSensitiveWord(resultStmt.getAsObject())
      }
      resultStmt.free()
      return word
    })
  },

  async deleteSensitiveWord(id: string): Promise<boolean> {
    return withDb((db) => {
      const stmt = db.prepare(`DELETE FROM sensitive_words WHERE id = ?`)
      stmt.run([id])
      stmt.free()
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async batchCreateSensitiveWords(words: SensitiveWordCreate[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    const now = dayjs().toISOString()
    const errors: string[] = []
    let created = 0
    let skipped = 0

    await withDb((db) => {
      for (const w of words) {
        try {
          if (!w.word.trim()) {
            skipped++
            continue
          }
          const checkStmt = db.prepare(`SELECT id FROM sensitive_words WHERE word = ?`)
          checkStmt.bind([w.word.trim()])
          if (checkStmt.step()) {
            checkStmt.free()
            skipped++
            continue
          }
          checkStmt.free()

          const id = uuidv4()
          const stmt = db.prepare(`
            INSERT INTO sensitive_words (id, word, category, level, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          stmt.run([
            id,
            w.word.trim(),
            w.category || 'other',
            w.level || 'medium',
            now,
            now
          ])
          stmt.free()
          created++
        } catch (e) {
          errors.push(`添加"${w.word}"失败: ${e}`)
        }
      }
    })

    return { created, skipped, errors }
  },

  async createReviewRecord(data: ReviewRecordCreate): Promise<ReviewRecord> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    return withDb((db) => {
      const stmt = db.prepare(`
        INSERT INTO review_records (
          id, targetId, targetType, reviewerId, reviewerName,
          action, rejectReason, rejectReasonId, beforeStatus,
          afterStatus, remark, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run([
        id,
        data.targetId,
        data.targetType,
        data.reviewerId,
        data.reviewerName,
        data.action,
        data.rejectReason || null,
        data.rejectReasonId || null,
        data.beforeStatus,
        data.afterStatus,
        data.remark || null,
        now
      ])
      stmt.free()

      const resultStmt = db.prepare(`SELECT ${REVIEW_RECORD_COLUMNS.join(', ')} FROM review_records WHERE id = ?`)
      resultStmt.bind([id])
      let record: ReviewRecord | undefined
      if (resultStmt.step()) {
        record = objToReviewRecord(resultStmt.getAsObject())
      }
      resultStmt.free()
      return record as ReviewRecord
    })
  },

  async listReviewRecords(params: ReviewRecordQueryParams): Promise<PaginatedResponse<ReviewRecord>> {
    const {
      page = 1,
      pageSize = 20,
      targetType,
      action,
      targetId,
      reviewerId,
      startDate,
      endDate
    } = params

    const conditions: string[] = []
    const values: unknown[] = []

    if (targetType && targetType !== 'all') {
      conditions.push('targetType = ?')
      values.push(targetType)
    }
    if (action && action !== 'all') {
      conditions.push('action = ?')
      values.push(action)
    }
    if (targetId) {
      conditions.push('targetId = ?')
      values.push(targetId)
    }
    if (reviewerId) {
      conditions.push('reviewerId = ?')
      values.push(reviewerId)
    }
    if (startDate) {
      conditions.push('createdAt >= ?')
      values.push(startDate)
    }
    if (endDate) {
      conditions.push('createdAt <= ?')
      values.push(endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rrSelect = REVIEW_RECORD_COLUMNS.join(', ')

    return withDb((db) => {
      let countSql = `SELECT COUNT(*) as count FROM review_records ${whereClause}`
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
        SELECT ${rrSelect} FROM review_records ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `

      let records: ReviewRecord[] = []
      const dataStmt = db.prepare(dataSql)
      if (values.length > 0) {
        dataStmt.bind(values as (string | number)[])
      }
      while (dataStmt.step()) {
        records.push(objToReviewRecord(dataStmt.getAsObject()))
      }
      dataStmt.free()

      return {
        data: records,
        total: countResult.count,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.count / pageSize)
      }
    })
  },

  async getReviewRecordsByTarget(targetId: string, targetType: ReviewRecord['targetType']): Promise<ReviewRecord[]> {
    return withDb((db) => {
      const stmt = db.prepare(`
        SELECT ${REVIEW_RECORD_COLUMNS.join(', ')} FROM review_records
        WHERE targetId = ? AND targetType = ?
        ORDER BY createdAt DESC
      `)
      stmt.bind([targetId, targetType])
      const records: ReviewRecord[] = []
      while (stmt.step()) {
        records.push(objToReviewRecord(stmt.getAsObject()))
      }
      stmt.free()
      return records
    })
  },

  async listRejectReasonTemplates(category?: string): Promise<RejectReasonTemplate[]> {
    return withDb((db) => {
      let sql = `SELECT ${REJECT_REASON_COLUMNS.join(', ')} FROM reject_reason_templates`
      const values: unknown[] = []
      if (category) {
        sql += ` WHERE category = ?`
        values.push(category)
      }
      sql += ` ORDER BY sortOrder ASC, createdAt ASC`

      const templates: RejectReasonTemplate[] = []
      const stmt = db.prepare(sql)
      if (values.length > 0) {
        stmt.bind(values as (string | number)[])
      }
      while (stmt.step()) {
        templates.push(objToRejectReasonTemplate(stmt.getAsObject()))
      }
      stmt.free()
      return templates
    })
  },

  async getRejectReasonTemplateById(id: string): Promise<RejectReasonTemplate | undefined> {
    return withDb((db) => {
      const stmt = db.prepare(`SELECT ${REJECT_REASON_COLUMNS.join(', ')} FROM reject_reason_templates WHERE id = ?`)
      stmt.bind([id])
      let template: RejectReasonTemplate | undefined
      if (stmt.step()) {
        template = objToRejectReasonTemplate(stmt.getAsObject())
      }
      stmt.free()
      return template
    })
  },

  async createRejectReasonTemplate(data: RejectReasonTemplateCreate): Promise<RejectReasonTemplate | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    if (!data.title.trim()) {
      return { error: '驳回原因标题不能为空' }
    }
    if (!data.description.trim()) {
      return { error: '驳回原因描述不能为空' }
    }

    return withDb((db) => {
      if (data.isDefault) {
        db.run(`UPDATE reject_reason_templates SET isDefault = 0 WHERE category = ?`, [data.category || 'general'])
      }

      const stmt = db.prepare(`
        INSERT INTO reject_reason_templates (
          id, title, description, category, isDefault, sortOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run([
        id,
        data.title.trim(),
        data.description.trim(),
        data.category || 'general',
        data.isDefault ? 1 : 0,
        data.sortOrder || 0,
        now,
        now
      ])
      stmt.free()

      const resultStmt = db.prepare(`SELECT ${REJECT_REASON_COLUMNS.join(', ')} FROM reject_reason_templates WHERE id = ?`)
      resultStmt.bind([id])
      let template: RejectReasonTemplate | undefined
      if (resultStmt.step()) {
        template = objToRejectReasonTemplate(resultStmt.getAsObject())
      }
      resultStmt.free()
      return template as RejectReasonTemplate
    })
  },

  async updateRejectReasonTemplate(id: string, data: RejectReasonTemplateUpdate): Promise<RejectReasonTemplate | undefined | { error: string }> {
    const now = dayjs().toISOString()

    return withDb((db) => {
      const checkStmt = db.prepare(`SELECT id, category FROM reject_reason_templates WHERE id = ?`)
      checkStmt.bind([id])
      let existingCategory = 'general'
      if (!checkStmt.step()) {
        checkStmt.free()
        return undefined
      }
      const obj = checkStmt.getAsObject()
      existingCategory = (obj.category as string) || 'general'
      checkStmt.free()

      if (data.isDefault) {
        const cat = data.category || existingCategory
        db.run(`UPDATE reject_reason_templates SET isDefault = 0 WHERE category = ? AND id != ?`, [cat, id])
      }

      const fields: string[] = []
      const values: unknown[] = []

      if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(data.title.trim())
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description.trim())
      }
      if (data.category !== undefined) {
        fields.push('category = ?')
        values.push(data.category)
      }
      if (data.isDefault !== undefined) {
        fields.push('isDefault = ?')
        values.push(data.isDefault ? 1 : 0)
      }
      if (data.sortOrder !== undefined) {
        fields.push('sortOrder = ?')
        values.push(data.sortOrder)
      }
      fields.push('updatedAt = ?')
      values.push(now)
      values.push(id)

      const stmt = db.prepare(`UPDATE reject_reason_templates SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(values as (string | number)[])
      stmt.free()

      const resultStmt = db.prepare(`SELECT ${REJECT_REASON_COLUMNS.join(', ')} FROM reject_reason_templates WHERE id = ?`)
      resultStmt.bind([id])
      let template: RejectReasonTemplate | undefined
      if (resultStmt.step()) {
        template = objToRejectReasonTemplate(resultStmt.getAsObject())
      }
      resultStmt.free()
      return template
    })
  },

  async deleteRejectReasonTemplate(id: string): Promise<boolean> {
    return withDb((db) => {
      const stmt = db.prepare(`DELETE FROM reject_reason_templates WHERE id = ?`)
      stmt.run([id])
      stmt.free()
      const result = db.exec(`SELECT changes() as cnt`)
      return ((result[0]?.values[0]?.[0] as number) || 0) > 0
    })
  },

  async getStats(): Promise<ModerationStats> {
    return withDb((db) => {
      const reviewSql = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN action = 'reject' THEN 1 ELSE 0 END) as rejected
        FROM review_records
      `
      const reviewRes = db.exec(reviewSql)
      const reviewRow = reviewRes[0].values[0]

      const pendingSql = `SELECT COUNT(*) as cnt FROM comments WHERE status = 'pending'`
      const pendingRes = db.exec(pendingSql)
      const pendingCount = (pendingRes[0].values[0][0] as number) || 0

      const swSql = `SELECT COUNT(*) as cnt FROM sensitive_words`
      const swRes = db.exec(swSql)
      const swCount = (swRes[0].values[0][0] as number) || 0

      return {
        totalReviewed: (reviewRow[0] as number) || 0,
        approved: (reviewRow[1] as number) || 0,
        rejected: (reviewRow[2] as number) || 0,
        pending: pendingCount,
        sensitiveWordCount: swCount,
        autoBlocked: 0,
        autoFlagged: 0
      }
    })
  }
}
