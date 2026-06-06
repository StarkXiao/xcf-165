import type { Middleware } from 'koa'

export const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)
    ctx.status = (error as { status?: number })?.status || 500
    ctx.body = {
      code: ctx.status,
      message: (error as Error).message || '服务器内部错误',
      data: null
    }
  }
}

export const responseHandler: Middleware = async (ctx, next) => {
  await next()

  if (!ctx.body && ctx.status === 404) {
    ctx.body = {
      code: 404,
      message: '接口不存在',
      data: null
    }
  }
}
