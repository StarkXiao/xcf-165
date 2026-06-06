import type { Middleware, DefaultContext, DefaultState } from 'koa'
import { userService } from '../services/userService'

declare module 'koa' {
  interface DefaultContext {
    userId?: string
  }
}

export interface AuthenticatedContext extends DefaultContext {
  userId: string
}

export function extractToken(ctx: DefaultContext): string | undefined {
  const authHeader = ctx.request.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return undefined
}

export const authMiddleware: Middleware<DefaultState, DefaultContext> = async (ctx, next) => {
  const token = extractToken(ctx)
  if (!token) {
    ctx.status = 401
    ctx.body = { code: 401, message: '未登录，请先登录', data: null }
    return
  }

  const userId = userService.getUserIdByToken(token)
  if (!userId) {
    ctx.status = 401
    ctx.body = { code: 401, message: '登录已失效，请重新登录', data: null }
    return
  }

  ctx.userId = userId
  await next()
}

export const optionalAuthMiddleware: Middleware<DefaultState, DefaultContext> = async (ctx, next) => {
  const token = extractToken(ctx)
  if (token) {
    const userId = userService.getUserIdByToken(token)
    if (userId) {
      ctx.userId = userId
    }
  }
  await next()
}
