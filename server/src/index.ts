import Koa from 'koa'
import cors from '@koa/cors'
import serve from 'koa-static'
import { koaBody } from 'koa-body'
import path from 'path'
import { config } from './config'
import { getDatabase } from './database'
import { errorHandler, responseHandler } from './middleware/errorHandler'
import itemRoutes from './routes/itemRoutes'

const app = new Koa()

getDatabase()

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

app.use('/uploads', serve(path.join(__dirname, '../uploads')))

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
  process.exit(0)
})
