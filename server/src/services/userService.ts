import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import crypto from 'crypto'
import { getDatabase, saveDatabase } from '../database'
import type { User, UserPublic, UserRegister, UserLogin, UserUpdate } from '../types'
import type { Database } from 'sql.js'

async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDatabase()
  const result = fn(db)
  saveDatabase(db)
  return result
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const tokenStore = new Map<string, string>()

function rowToUser(row: unknown[]): User {
  return {
    id: row[0] as string,
    username: row[1] as string,
    password: row[2] as string,
    nickname: (row[3] as string) || null,
    avatar: (row[4] as string) || null,
    bio: (row[5] as string) || null,
    createdAt: row[6] as string,
    updatedAt: row[7] as string
  }
}

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.createdAt
  }
}

export const userService = {
  async register(data: UserRegister): Promise<UserPublic | { error: string }> {
    const now = dayjs().toISOString()
    const id = uuidv4()

    if (!data.username || !data.password) {
      return { error: '用户名和密码为必填项' }
    }
    if (data.username.length < 3) {
      return { error: '用户名至少3个字符' }
    }
    if (data.password.length < 6) {
      return { error: '密码至少6个字符' }
    }

    return withDb((db) => {
      const existing = db.exec(
        `SELECT * FROM users WHERE username = '${data.username}'`
      )
      if (existing.length > 0 && existing[0].values.length > 0) {
        return { error: '用户名已存在' }
      }

      const hashedPassword = hashPassword(data.password)
      const stmt = db.prepare(
        `INSERT INTO users (id, username, password, nickname, avatar, bio, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      stmt.run([
        id,
        data.username,
        hashedPassword,
        data.nickname || data.username,
        null,
        null,
        now,
        now
      ])
      stmt.free()

      const result = db.exec(`SELECT * FROM users WHERE id = '${id}'`)
      return toPublic(rowToUser(result[0].values[0]))
    })
  },

  async login(data: UserLogin): Promise<{ token: string; user: UserPublic } | { error: string }> {
    if (!data.username || !data.password) {
      return { error: '用户名和密码为必填项' }
    }

    return withDb((db) => {
      const result = db.exec(
        `SELECT * FROM users WHERE username = '${data.username}'`
      )
      if (result.length === 0 || result[0].values.length === 0) {
        return { error: '用户名或密码错误' }
      }

      const user = rowToUser(result[0].values[0])
      if (!verifyPassword(data.password, user.password)) {
        return { error: '用户名或密码错误' }
      }

      const token = generateToken()
      tokenStore.set(token, user.id)

      return {
        token,
        user: toPublic(user)
      }
    })
  },

  logout(token: string): void {
    tokenStore.delete(token)
  },

  getUserIdByToken(token: string): string | undefined {
    return tokenStore.get(token)
  },

  async getById(id: string): Promise<UserPublic | undefined> {
    return withDb((db) => {
      const result = db.exec(`SELECT * FROM users WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return undefined
      }
      return toPublic(rowToUser(result[0].values[0]))
    })
  },

  async update(id: string, data: UserUpdate): Promise<UserPublic | { error: string }> {
    const now = dayjs().toISOString()

    return withDb((db) => {
      const updates: string[] = []
      const values: unknown[] = []

      if (data.nickname !== undefined) {
        updates.push('nickname = ?')
        values.push(data.nickname)
      }
      if (data.avatar !== undefined) {
        updates.push('avatar = ?')
        values.push(data.avatar)
      }
      if (data.bio !== undefined) {
        updates.push('bio = ?')
        values.push(data.bio)
      }
      if (data.password !== undefined) {
        if (data.password.length < 6) {
          return { error: '密码至少6个字符' }
        }
        updates.push('password = ?')
        values.push(hashPassword(data.password))
      }

      if (updates.length === 0) {
        const result = db.exec(`SELECT * FROM users WHERE id = '${id}'`)
        if (result.length === 0 || result[0].values.length === 0) {
          return { error: '用户不存在' }
        }
        return toPublic(rowToUser(result[0].values[0]))
      }

      updates.push('updatedAt = ?')
      values.push(now)
      values.push(id)

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      const stmt = db.prepare(sql)
      stmt.run(values as (string | number)[])
      stmt.free()

      const result = db.exec(`SELECT * FROM users WHERE id = '${id}'`)
      if (result.length === 0 || result[0].values.length === 0) {
        return { error: '用户不存在' }
      }
      return toPublic(rowToUser(result[0].values[0]))
    })
  }
}
