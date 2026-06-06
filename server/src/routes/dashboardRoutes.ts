import Router from '@koa/router'
import type { DefaultContext, DefaultState } from 'koa'
import { dashboardService } from '../services/dashboardService'

const router = new Router<DefaultState, DefaultContext>({ prefix: '/api/dashboard' })

router.get('/overview', async (ctx) => {
  const days = ctx.query.days ? Number(ctx.query.days) : 30
  const data = await dashboardService.getOverview(days)
  ctx.body = {
    code: 200,
    message: 'success',
    data
  }
})

export default router
