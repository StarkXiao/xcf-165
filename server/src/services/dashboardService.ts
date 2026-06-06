import dayjs from 'dayjs'
import { getDatabase } from '../database'
import type { Database } from 'sql.js'
import type { DashboardData, DashboardEmotionStats, DashboardVisitTrend } from '../types'
import { EMOTION_TAGS } from '../types'

async function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await getDatabase()
  return fn(db)
}

function getItemStats(db: Database): DashboardData['itemStats'] & { totalViews: number; totalLikes: number; totalBidCount: number } {
  const result = db.exec(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
      COALESCE(SUM(views), 0) as totalViews,
      COALESCE(SUM(likes), 0) as totalLikes,
      COALESCE(SUM(bidCount), 0) as totalBidCount
    FROM items
  `)

  if (result.length === 0) {
    return { total: 0, draft: 0, scheduled: 0, active: 0, sold: 0, archived: 0, totalViews: 0, totalLikes: 0, totalBidCount: 0 }
  }

  const row = result[0].values[0]
  return {
    total: (row[0] as number) || 0,
    draft: (row[1] as number) || 0,
    scheduled: (row[2] as number) || 0,
    active: (row[3] as number) || 0,
    sold: (row[4] as number) || 0,
    archived: (row[5] as number) || 0,
    totalViews: (row[6] as number) || 0,
    totalLikes: (row[7] as number) || 0,
    totalBidCount: (row[8] as number) || 0
  }
}

function getSalesStats(db: Database): DashboardData['salesStats'] {
  const result = db.exec(`
    SELECT
      COUNT(*) as totalOrders,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as totalSalesAmount
    FROM orders
  `)

  if (result.length === 0) {
    return { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, totalSalesAmount: 0, averageOrderAmount: 0 }
  }

  const row = result[0].values[0]
  const totalOrders = (row[0] as number) || 0
  const completedOrders = (row[1] as number) || 0
  const cancelledOrders = (row[2] as number) || 0
  const totalSalesAmount = (row[3] as number) || 0

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalSalesAmount,
    averageOrderAmount: completedOrders > 0 ? totalSalesAmount / completedOrders : 0
  }
}

function getEmotionStats(db: Database): DashboardEmotionStats[] {
  const result = db.exec(`
    SELECT emotionTags
    FROM items
    WHERE status IN ('active', 'sold')
      AND emotionTags IS NOT NULL
      AND emotionTags != ''
  `)

  const tagCounts: Record<string, number> = {}
  EMOTION_TAGS.forEach(tag => { tagCounts[tag] = 0 })

  let totalTagged = 0

  if (result.length > 0) {
    result[0].values.forEach(row => {
      const tagsStr = row[0] as string
      const tags = tagsStr.split(',').filter(Boolean)
      tags.forEach(tag => {
        const trimmedTag = tag.trim()
        if (tagCounts[trimmedTag] !== undefined) {
          tagCounts[trimmedTag]++
          totalTagged++
        }
      })
    })
  }

  return EMOTION_TAGS.map(tag => ({
    tag,
    count: tagCounts[tag],
    percentage: totalTagged > 0 ? (tagCounts[tag] / totalTagged) * 100 : 0
  })).sort((a, b) => b.count - a.count)
}

function getVisitTrend(db: Database, days: number = 30): DashboardVisitTrend[] {
  const startDate = dayjs().subtract(days - 1, 'day').startOf('day')
  const endDate = dayjs().endOf('day')

  const dateMap = new Map<string, { views: number; items: number; orders: number }>()

  for (let i = 0; i < days; i++) {
    const d = startDate.add(i, 'day').format('YYYY-MM-DD')
    dateMap.set(d, { views: 0, items: 0, orders: 0 })
  }

  const startStr = startDate.toISOString()
  const endStr = endDate.toISOString()

  const itemsStmt = db.prepare(`
    SELECT
      DATE(COALESCE(publishedAt, scheduledAt, createdAt)) as pubDate,
      COUNT(*) as itemCount,
      COALESCE(SUM(views), 0) as totalViews
    FROM items
    WHERE COALESCE(publishedAt, scheduledAt, createdAt) >= ?
      AND COALESCE(publishedAt, scheduledAt, createdAt) <= ?
    GROUP BY pubDate
  `)
  itemsStmt.bind([startStr, endStr])
  while (itemsStmt.step()) {
    const obj = itemsStmt.getAsObject() as Record<string, unknown>
    const date = obj.pubDate as string
    const entry = dateMap.get(date)
    if (entry) {
      entry.items = (obj.itemCount as number) || 0
      entry.views = (obj.totalViews as number) || 0
    }
  }
  itemsStmt.free()

  const ordersStmt = db.prepare(`
    SELECT
      DATE(createdAt) as orderDate,
      COUNT(*) as orderCount
    FROM orders
    WHERE createdAt >= ?
      AND createdAt <= ?
    GROUP BY orderDate
  `)
  ordersStmt.bind([startStr, endStr])
  while (ordersStmt.step()) {
    const obj = ordersStmt.getAsObject() as Record<string, unknown>
    const date = obj.orderDate as string
    const entry = dateMap.get(date)
    if (entry) {
      entry.orders = (obj.orderCount as number) || 0
    }
  }
  ordersStmt.free()

  const trend: DashboardVisitTrend[] = []
  dateMap.forEach((value, date) => {
    trend.push({
      date,
      views: value.views,
      items: value.items,
      orders: value.orders
    })
  })

  return trend.sort((a, b) => a.date.localeCompare(b.date))
}

function getUserCount(db: Database): number {
  const result = db.exec(`SELECT COUNT(*) FROM users`)
  return (result[0]?.values[0]?.[0] as number) || 0
}

export const dashboardService = {
  async getOverview(days: number = 30): Promise<DashboardData> {
    return withDb((db) => {
      const itemStatsAll = getItemStats(db)
      const salesStats = getSalesStats(db)
      const emotionStats = getEmotionStats(db)
      const visitTrend = getVisitTrend(db, days)
      const userCount = getUserCount(db)

      const { totalViews, totalLikes, totalBidCount, ...itemStats } = itemStatsAll

      return {
        itemStats,
        salesStats,
        emotionStats,
        visitTrend,
        totalViews,
        totalLikes,
        totalBidCount,
        userCount
      }
    })
  }
}
