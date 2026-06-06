import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { moderationService } from '../services/moderationService'
import { userService } from '../services/userService'
import { authMiddleware } from '../middleware/auth'
import type {
  SensitiveWordCreate, SensitiveWordUpdate, SensitiveWordQueryParams,
  ReviewRecordQueryParams,
  RejectReasonTemplateCreate, RejectReasonTemplateUpdate
} from '../types'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/moderation' })

router.get('/stats', authMiddleware, async (ctx) => {
  const stats = await moderationService.getStats()
  ctx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.post('/check', authMiddleware, async (ctx) => {
  const { content } = ctx.request.body as { content: string }
  if (!content) {
    ctx.status = 400
    ctx.body = { code: 400, message: '内容为必填项', data: null }
    return
  }
  const result = await moderationService.checkContent(content)
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/sensitive-words', authMiddleware, async (ctx) => {
  const query = ctx.query as SensitiveWordQueryParams
  const result = await moderationService.listSensitiveWords({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined
  })
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/sensitive-words/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const word = await moderationService.getSensitiveWordById(id)
  if (!word) {
    ctx.status = 404
    ctx.body = { code: 404, message: '敏感词不存在', data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: 'success',
    data: word
  }
})

router.post('/sensitive-words', authMiddleware, async (ctx) => {
  const body = ctx.request.body as SensitiveWordCreate
  const result = await moderationService.createSensitiveWord(body)
  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }
  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '创建成功',
    data: result
  }
})

router.post('/sensitive-words/batch', authMiddleware, async (ctx) => {
  const { words } = ctx.request.body as { words: SensitiveWordCreate[] }
  if (!Array.isArray(words)) {
    ctx.status = 400
    ctx.body = { code: 400, message: 'words 必须是数组', data: null }
    return
  }
  const result = await moderationService.batchCreateSensitiveWords(words)
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.put('/sensitive-words/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const body = ctx.request.body as SensitiveWordUpdate
  const result = await moderationService.updateSensitiveWord(id, body)
  if (!result) {
    ctx.status = 404
    ctx.body = { code: 404, message: '敏感词不存在', data: null }
    return
  }
  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: '更新成功',
    data: result
  }
})

router.delete('/sensitive-words/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const removed = await moderationService.deleteSensitiveWord(id)
  if (!removed) {
    ctx.status = 404
    ctx.body = { code: 404, message: '敏感词不存在', data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: '删除成功',
    data: null
  }
})

router.get('/review-records', authMiddleware, async (ctx) => {
  const query = ctx.query as ReviewRecordQueryParams
  const result = await moderationService.listReviewRecords({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined
  })
  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/review-records/target/:targetType/:targetId', authMiddleware, async (ctx) => {
  const { targetType, targetId } = ctx.params
  const records = await moderationService.getReviewRecordsByTarget(
    targetId,
    targetType as 'comment' | 'item' | 'message'
  )
  ctx.body = {
    code: 200,
    message: 'success',
    data: records
  }
})

router.get('/reject-reasons', authMiddleware, async (ctx) => {
  const { category } = ctx.query as { category?: string }
  const templates = await moderationService.listRejectReasonTemplates(category)
  ctx.body = {
    code: 200,
    message: 'success',
    data: templates
  }
})

router.get('/reject-reasons/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const template = await moderationService.getRejectReasonTemplateById(id)
  if (!template) {
    ctx.status = 404
    ctx.body = { code: 404, message: '驳回原因模板不存在', data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: 'success',
    data: template
  }
})

router.post('/reject-reasons', authMiddleware, async (ctx) => {
  const body = ctx.request.body as RejectReasonTemplateCreate
  const result = await moderationService.createRejectReasonTemplate(body)
  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }
  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '创建成功',
    data: result
  }
})

router.put('/reject-reasons/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const body = ctx.request.body as RejectReasonTemplateUpdate
  const result = await moderationService.updateRejectReasonTemplate(id, body)
  if (!result) {
    ctx.status = 404
    ctx.body = { code: 404, message: '驳回原因模板不存在', data: null }
    return
  }
  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: '更新成功',
    data: result
  }
})

router.delete('/reject-reasons/:id', authMiddleware, async (ctx) => {
  const { id } = ctx.params
  const removed = await moderationService.deleteRejectReasonTemplate(id)
  if (!removed) {
    ctx.status = 404
    ctx.body = { code: 404, message: '驳回原因模板不存在', data: null }
    return
  }
  ctx.body = {
    code: 200,
    message: '删除成功',
    data: null
  }
})

export default router
