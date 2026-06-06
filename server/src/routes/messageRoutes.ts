import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { messageService } from '../services/messageService'
import type { MessageQueryParams } from '../types'
import { authMiddleware, type AuthenticatedContext } from '../middleware/auth'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/messages' })

router.get('/', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const query = authCtx.query as Record<string, string | undefined>

  const isReadRaw = query.isRead
  let isReadVal: boolean | 'all' = 'all'
  if (isReadRaw === 'true') isReadVal = true
  else if (isReadRaw === 'false') isReadVal = false

  const result = await messageService.list({
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    type: (query.type as MessageQueryParams['type']) || 'all',
    isRead: isReadVal
  }, authCtx.userId)

  authCtx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/stats', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const stats = await messageService.getStats(authCtx.userId)
  authCtx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.get('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const message = await messageService.getById(id, authCtx.userId)

  if (!message) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '消息不存在', data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: 'success',
    data: message
  }
})

router.put('/:id/read', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await messageService.markAsRead(id, authCtx.userId)

  if (!result) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '消息不存在', data: null }
    return
  }

  if (typeof result === 'object' && 'error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '已标记为已读',
    data: result
  }
})

router.put('/read-all', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const count = await messageService.markAllAsRead(authCtx.userId)
  authCtx.body = {
    code: 200,
    message: `已将 ${count} 条消息标记为已读`,
    data: { count }
  }
})

router.delete('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await messageService.delete(id, authCtx.userId)

  if (typeof result === 'object' && 'error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '消息已删除',
    data: { success: result as boolean }
  }
})

router.delete('/', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const count = await messageService.clearAll(authCtx.userId)
  authCtx.body = {
    code: 200,
    message: `已清空 ${count} 条消息`,
    data: { count }
  }
})

export default router
