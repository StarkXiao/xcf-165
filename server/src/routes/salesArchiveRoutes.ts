import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { salesArchiveService } from '../services/salesArchiveService'
import type { SalesArchiveCreate, SalesArchiveUpdate, SalesArchiveQueryParams } from '../types'
import { authMiddleware, type AuthenticatedContext } from '../middleware/auth'
import dayjs from 'dayjs'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/sales-archives' })

router.post('/', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const body = authCtx.request.body as SalesArchiveCreate

  if (!body.itemId) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: '藏品ID为必填项', data: null }
    return
  }

  const result = await salesArchiveService.create(body, authCtx.userId)

  if ('error' in result) {
    authCtx.status = 400
    authCtx.body = { code: 400, message: result.error, data: null }
    return
  }

  authCtx.status = 201
  authCtx.body = {
    code: 201,
    message: '成交归档创建成功',
    data: result
  }
})

router.get('/stats', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const stats = await salesArchiveService.getStats(authCtx.userId)
  authCtx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.get('/export', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const query = authCtx.query as SalesArchiveQueryParams

  const data = await salesArchiveService.exportAll(query, authCtx.userId)

  const csvHeader = [
    '藏品名称', '分类', '情绪标签', '买家姓名', '物品去向',
    '成交价格', '告别寄语', '归档时间'
  ].join(',')

  const csvRows = data.map((archive) => {
    return [
      `"${(archive.itemTitle || '').replace(/"/g, '""')}"`,
      `"${(archive.category || '').replace(/"/g, '""')}"`,
      `"${(archive.emotionTags || '').replace(/"/g, '""')}"`,
      `"${(archive.buyerName || '').replace(/"/g, '""')}"`,
      `"${(archive.destination || '').replace(/"/g, '""')}"`,
      archive.finalPrice,
      `"${(archive.farewellMessage || '').replace(/"/g, '""')}"`,
      `"${dayjs(archive.archivedAt).format('YYYY-MM-DD HH:mm:ss')}"`
    ].join(',')
  })

  const csvContent = '\uFEFF' + csvHeader + '\n' + csvRows.join('\n')

  authCtx.set('Content-Type', 'text/csv; charset=utf-8')
  authCtx.set('Content-Disposition', `attachment; filename="sales-archives-${dayjs().format('YYYYMMDD-HHmmss')}.csv"`)
  authCtx.body = csvContent
})

router.get('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const result = await salesArchiveService.getById(id, authCtx.userId)

  if (!result) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '归档不存在', data: null }
    return
  }

  if ('error' in result) {
    authCtx.status = 403
    authCtx.body = { code: 403, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const query = authCtx.query as SalesArchiveQueryParams

  const result = await salesArchiveService.list({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    minPrice: query.minPrice !== undefined ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice !== undefined ? Number(query.maxPrice) : undefined
  }, authCtx.userId)

  authCtx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.put('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params
  const body = authCtx.request.body as SalesArchiveUpdate

  const result = await salesArchiveService.update(id, body, authCtx.userId)

  if (!result) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '归档不存在', data: null }
    return
  }

  if ('error' in result) {
    authCtx.status = 403
    authCtx.body = { code: 403, message: result.error, data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '归档更新成功',
    data: result
  }
})

router.delete('/:id', authMiddleware, async (ctx) => {
  const authCtx = ctx as AuthenticatedContext
  const { id } = authCtx.params

  const result = await salesArchiveService.delete(id, authCtx.userId)

  if (typeof result === 'object' && 'error' in result) {
    authCtx.status = 403
    authCtx.body = { code: 403, message: result.error, data: null }
    return
  }

  if (!result) {
    authCtx.status = 404
    authCtx.body = { code: 404, message: '归档不存在', data: null }
    return
  }

  authCtx.body = {
    code: 200,
    message: '归档删除成功',
    data: null
  }
})

export default router
