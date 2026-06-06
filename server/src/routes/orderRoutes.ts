import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { orderService } from '../services/orderService'
import type { OrderCreate, OrderQueryParams } from '../types'
import { authMiddleware, optionalAuthMiddleware, type AuthenticatedContext } from '../middleware/auth'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/orders' })

router.post('/', optionalAuthMiddleware, async (ctx) => {
  const body = ctx.request.body as OrderCreate

  if (!body.itemId || !body.buyerName) {
    ctx.status = 400
    ctx.body = { code: 400, message: '藏品ID和买家姓名为必填项', data: null }
    return
  }

  const result = await orderService.create(body, ctx.userId)

  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '下单成功',
    data: result
  }
})

router.get('/stats', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { role = 'all' } = authCtx.query as { role?: 'buyer' | 'seller' | 'all' }
  const stats = await orderService.getStats(authCtx.userId, role)
  authCtx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.get('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const order = await orderService.getById(id)

  if (!order) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '订单不存在', data: null }
    return
  }

  const userId = authCtx.userId
  if (order.buyerId !== userId && order.sellerId !== userId) {
    authCtx.status = 403
    authCtx.body = { code: 403, message: '无权限查看该订单', data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: 'success',
    data: order
  }
})

router.get('/', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const query = authCtx.query as OrderQueryParams

  const result = await orderService.list({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined
  }, authCtx.userId)

  authCtx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.post('/:id/confirm', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await orderService.confirm(id, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '订单确认成功',
    data: result
  }
})

router.post('/:id/paid', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await orderService.markPaid(id, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '已标记为已付款',
    data: result
  }
})

router.post('/:id/shipped', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await orderService.markShipped(id, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '已标记为已发货',
    data: result
  }
})

router.post('/:id/complete', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await orderService.complete(id, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '订单已完成',
    data: result
  }
})

router.post('/:id/cancel', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await orderService.cancel(id, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '订单已取消',
    data: result
  }
})

export default router
