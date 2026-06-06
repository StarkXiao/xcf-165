import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import path from 'path'
import fs from 'fs'
import { config } from './config'
import { getDatabase, closeDatabase } from './database'
import { errorHandler, responseHandler } from './middleware/errorHandler'
import itemRoutes from './routes/itemRoutes'

async function start() {
  const app = new Koa()

  await getDatabase()

  app.use(cors({
    origin: (ctx) => {
      const origin = ctx.request.headers.origin || ''
      if (config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*')) {
        return origin
      }
      return config.allowedOrigins[0]
    },
    credentials: true
  }))

  app.use(koaBody({
    multipart: true,
    formidable: {
      maxFileSize: config.maxUploadSize,
      keepExtensions: true
    },
    jsonLimit: '10mb',
    formLimit: '10mb'
  }))

  app.use(errorHandler)

  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'uploads', ctx.path.replace('/uploads/', ''))
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        }
        ctx.type = mimeTypes[ext] || 'application/octet-stream'
        ctx.body = fs.readFileSync(filePath)
        return
      }
    }
    await next()
  })

  app.use(itemRoutes.routes())
  app.use(itemRoutes.allowedMethods())

  app.use(responseHandler)

  app.listen(config.port, () => {
    console.log(`🚀 分手遗物拍卖行后端服务已启动`)
    console.log(`📡 服务地址: http://localhost:${config.port}`)
    console.log(`📚 数据库: ${config.dbPath}`)
  })

  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...')
    closeDatabase()
    process.exit(0)
  })
}

start().catch(console.error)
