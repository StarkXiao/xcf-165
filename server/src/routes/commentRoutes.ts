import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { commentService } from '../services/commentService'
import { itemService } from '../services/itemService'
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import type { CommentCreate, CommentQueryParams } from '../types'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/comments' })

router.get('/stats', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const stats = await commentService.getStats(userId)
  ctx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.get('/item/:itemId', async (ctx) => {
  const { itemId } = ctx.params
  const comments = await commentService.getByItemId(itemId)
  ctx.body = {
    code: 200,
    message: 'success',
    data: comments
  }
})

router.get('/', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const query = ctx.query as CommentQueryParams
  const result = await commentService.list({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined
  }, userId)

  const dataWithItemInfo = await Promise.all(
    result.data.map(async (comment) => {
      const info = await commentService.getItemInfoByCommentId(comment.id)
      return { ...comment, itemTitle: info?.itemTitle }
    })
  )

  ctx.body = {
    code: 200,
    message: 'success',
    data: { ...result, data: dataWithItemInfo }
  }
})

router.post('/', optionalAuthMiddleware, async (ctx) => {
  const body = ctx.request.body as CommentCreate

  if (!body.itemId) {
    ctx.status = 400
    ctx.body = { code: 400, message: '藏品ID为必填项', data: null }
    return
  }

  const item = await itemService.getById(body.itemId)
  if (!item) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  const result = await commentService.create(body, ctx.userId)

  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '留言提交成功，等待审核',
    data: result
  }
})

router.post('/:id/approve', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const userId = ctx.userId!
  const result = await commentService.approve(id, userId)

  if (!result) {
    ctx.status = 404
    ctx.body = { code: 404, message: '留言不存在', data: null }
    return
  }

  if ('error' in result) {
    const err = result as { error: string; unauthorized?: boolean }
    ctx.status = err.unauthorized ? 403 : 404
    ctx.body = { code: ctx.status, message: err.error, data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: '审核通过',
    data: result
  }
})

router.post('/:id/reject', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const userId = ctx.userId!
  const result = await commentService.reject(id, userId)

  if (!result) {
    ctx.status = 404
    ctx.body = { code: 404, message: '留言不存在', data: null }
    return
  }

  if ('error' in result) {
    const err = result as { error: string; unauthorized?: boolean }
    ctx.status = err.unauthorized ? 403 : 404
    ctx.body = { code: ctx.status, message: err.error, data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: '已拒绝',
    data: result
  }
})

router.delete('/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const userId = ctx.userId!
  const removed = await commentService.delete(id, userId)

  if (typeof removed === 'object' && removed !== null && 'error' in removed) {
    const err = removed as { error: string; unauthorized?: boolean }
    ctx.status = err.unauthorized ? 403 : 404
    ctx.body = { code: ctx.status, message: err.error, data: null }
    return
  }

  if (!removed) {
    ctx.status = 404
    ctx.body = { code: 404, message: '留言不存在', data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: '删除成功',
    data: null
  }
})

export default router
