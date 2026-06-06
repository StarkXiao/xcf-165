import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { itemService } from '../services/itemService'
import { uploadService } from '../services/uploadService'
import { EMOTION_TAGS, CATEGORIES, CONDITIONS } from '../types'
import type { ItemCreate, ItemDraftCreate, ItemUpdate, QueryParams, BidCreate } from '../types'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/items' })

type UploadedFile = {
  name: string
  type: string
  path: string
  size: number
}

function getUploadedFile(files: unknown): UploadedFile | undefined {
  if (!files || typeof files !== 'object') return undefined

  const file = (files as Record<string, unknown>).file
  if (Array.isArray(file)) {
    return file[0] as UploadedFile | undefined
  }

  return file as UploadedFile | undefined
}

router.get('/', async (ctx) => {
  const query = ctx.query as QueryParams

  const result = await itemService.list({
    ...query,
    page: query.page ? Number(query.page) : undefined,
    pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    minPrice: query.minPrice ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined
  })

  ctx.body = {
    code: 200,
    message: 'success',
    data: result
  }
})

router.get('/meta', async (ctx) => {
  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      emotionTags: EMOTION_TAGS,
      categories: CATEGORIES,
      conditions: CONDITIONS
    }
  }
})

router.get('/stats', async (ctx) => {
  const stats = await itemService.getStats()
  ctx.body = {
    code: 200,
    message: 'success',
    data: stats
  }
})

router.get('/:id', async (ctx) => {
  const { id } = ctx.params
  const item = await itemService.getById(id)

  if (!item) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: 'success',
    data: item
  }
})

router.post('/', async (ctx) => {
  const body = ctx.request.body as ItemCreate

  if (!body.title || !body.description || !body.story) {
    ctx.status = 400
    ctx.body = { code: 400, message: '标题、描述和故事为必填项', data: null }
    return
  }

  const item = await itemService.create(body)

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '创建成功',
    data: item
  }
})

router.post('/drafts', async (ctx) => {
  const body = ctx.request.body as ItemDraftCreate
  const item = await itemService.createDraft(body)

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '草稿保存成功',
    data: item
  }
})

router.post('/upload', async (ctx) => {
  const file = getUploadedFile(ctx.request.files)

  if (!file) {
    ctx.status = 400
    ctx.body = { code: 400, message: '请上传图片', data: null }
    return
  }

  try {
    const result = await uploadService.saveFile(file)
    ctx.body = {
      code: 200,
      message: '上传成功',
      data: result
    }
  } catch (error) {
    ctx.status = 400
    ctx.body = { code: 400, message: (error as Error).message, data: null }
  }
})

router.put('/:id', async (ctx) => {
  const { id } = ctx.params
  const body = ctx.request.body as ItemUpdate

  const existing = await itemService.getById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  const item = await itemService.update(id, body)

  ctx.body = {
    code: 200,
    message: '更新成功',
    data: item
  }
})

router.delete('/:id', async (ctx) => {
  const { id } = ctx.params

  const existing = await itemService.getById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  if (existing.imageUrl?.startsWith('/uploads/')) {
    const filename = existing.imageUrl.replace('/uploads/', '')
    await uploadService.deleteFile(filename)
  }

  await itemService.delete(id)

  ctx.body = {
    code: 200,
    message: '删除成功',
    data: null
  }
})

router.post('/:id/like', async (ctx) => {
  const { id } = ctx.params

  const existing = await itemService.getById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  const result = await itemService.like(id)

  ctx.body = {
    code: 200,
    message: '点赞成功',
    data: result
  }
})

router.get('/:id/bids', async (ctx) => {
  const { id } = ctx.params

  const existing = await itemService.getById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  const bids = await itemService.getBidsByItemId(id)

  ctx.body = {
    code: 200,
    message: 'success',
    data: bids
  }
})

router.post('/:id/bids', async (ctx) => {
  const { id } = ctx.params
  const body = ctx.request.body as Omit<BidCreate, 'itemId'>

  if (!body.bidder || !body.amount) {
    ctx.status = 400
    ctx.body = { code: 400, message: '出价人昵称和金额为必填项', data: null }
    return
  }

  const result = await itemService.placeBid({
    itemId: id,
    bidder: body.bidder,
    amount: Number(body.amount)
  })

  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '出价成功',
    data: result
  }
})

router.post('/:id/sold', async (ctx) => {
  const { id } = ctx.params

  const existing = await itemService.getById(id)
  if (!existing) {
    ctx.status = 404
    ctx.body = { code: 404, message: '藏品不存在', data: null }
    return
  }

  const item = await itemService.markAsSold(id)

  ctx.body = {
    code: 200,
    message: '标记成交成功',
    data: item
  }
})

export default router
