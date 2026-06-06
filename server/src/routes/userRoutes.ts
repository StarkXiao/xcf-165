import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { userService } from '../services/userService'
import { itemService } from '../services/itemService'
import { authMiddleware, extractToken } from '../middleware/auth'
import type { UserRegister, UserLogin, UserUpdate, QueryParams } from '../types'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/users' })

router.post('/register', async (ctx) => {
  const body = ctx.request.body as UserRegister
  const result = await userService.register(body)

  if ('error' in result) {
    ctx.status = 400
    ctx.body = { code: 400, message: result.error, data: null }
    return
  }

  ctx.status = 201
  ctx.body = {
    code: 201,
    message: '注册成功',
    data: result
  }
})

router.post('/login', async (ctx) => {
  const body = ctx.request.body as UserLogin
  const result = await userService.login(body)

  if ('error' in result) {
    ctx.status = 401
    ctx.body = { code: 401, message: result.error, data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: '登录成功',
    data: result
  }
})

router.post('/logout', authMiddleware, async (ctx) => {
  const token = extractToken(ctx)
  if (token) {
    userService.logout(token)
  }
  ctx.body = {
    code: 200,
    message: '退出成功',
    data: null
  }
})

router.get('/me', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const user = await userService.getById(userId)

  if (!user) {
    ctx.status = 404
    ctx.body = { code: 404, message: '用户不存在', data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: 'success',
    data: user
  }
})

router.put('/me', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const body = ctx.request.body as UserUpdate
  const result = await userService.update(userId, body)

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

router.get('/:id', async (ctx) => {
  const { id } = ctx.params
  const user = await userService.getById(id)

  if (!user) {
    ctx.status = 404
    ctx.body = { code: 404, message: '用户不存在', data: null }
    return
  }

  ctx.body = {
    code: 200,
    message: 'success',
    data: user
  }
})

router.get('/:id/items', async (ctx) => {
  const { id } = ctx.params
  const query = ctx.query as QueryParams

  const result = await itemService.listByOwner(id, {
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

router.get('/me/favorites', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const query = ctx.query as QueryParams

  const result = await itemService.getFavoritesByUserId(userId, {
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

router.get('/me/items', authMiddleware, async (ctx) => {
  const userId = ctx.userId!
  const query = ctx.query as QueryParams

  const result = await itemService.listByOwner(userId, {
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

export default router
