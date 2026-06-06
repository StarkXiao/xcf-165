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

const USER_COLUMNS = [
  'id', 'username', 'password', 'nickname', 'avatar', 'bio', 'createdAt', 'updatedAt'
] as const

const USER_SELECT = USER_COLUMNS.join(', ')

function objToUser(obj: Record<string, unknown>): User {
  return {
    id: obj.id as string,
    username: obj.username as string,
    password: obj.password as string,
    nickname: (obj.nickname as string) || null,
    avatar: (obj.avatar as string) || null,
    bio: (obj.bio as string) || null,
    createdAt: obj.createdAt as string,
    updatedAt: obj.updatedAt as string
  }
}

function readOneUser(db: Database, id: string): User | undefined {
  const stmt = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`)
  stmt.bind([id])
  let user: User | undefined
  if (stmt.step()) {
    user = objToUser(stmt.getAsObject())
  }
  stmt.free()
  return user
}

function readOneUserByUsername(db: Database, username: string): User | undefined {
  const stmt = db.prepare(`SELECT ${USER_SELECT} FROM users WHERE username = ?`)
  stmt.bind([username])
  let user: User | undefined
  if (stmt.step()) {
    user = objToUser(stmt.getAsObject())
  }
  stmt.free()
  return user
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
      if (readOneUserByUsername(db, data.username)) {
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

      const user = readOneUser(db, id)
      return toPublic(user as User)
    })
  },

  async login(data: UserLogin): Promise<{ token: string; user: UserPublic } | { error: string }> {
    if (!data.username || !data.password) {
      return { error: '用户名和密码为必填项' }
    }

    return withDb((db) => {
      const user = readOneUserByUsername(db, data.username)
      if (!user) {
        return { error: '用户名或密码错误' }
      }

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
      const user = readOneUser(db, id)
      return user ? toPublic(user) : undefined
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
        const user = readOneUser(db, id)
        if (!user) {
          return { error: '用户不存在' }
        }
        return toPublic(user)
      }

      updates.push('updatedAt = ?')
      values.push(now)
      values.push(id)

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      const stmt = db.prepare(sql)
      stmt.run(values as (string | number)[])
      stmt.free()

      const user = readOneUser(db, id)
      if (!user) {
        return { error: '用户不存在' }
      }
      return toPublic(user)
    })
  }
}
