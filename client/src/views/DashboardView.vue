<template>
  <div class="dashboard-view">
    <div class="container">
      <div class="dashboard-header">
        <div>
          <h1 class="page-title">📊 数据看板</h1>
          <p class="page-subtitle">全站运营数据概览</p>
        </div>
        <div class="header-actions">
          <select v-model="trendDays" class="trend-select" @change="fetchData">
            <option :value="7">近 7 天</option>
            <option :value="14">近 14 天</option>
            <option :value="30">近 30 天</option>
          </select>
          <button class="btn btn-secondary" @click="fetchData" :disabled="loading">
            {{ loading ? '加载中...' : '🔄 刷新' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载数据中...</p>
      </div>

      <template v-else-if="dashboardData">
        <div class="summary-cards">
          <div class="summary-card card">
            <div class="summary-icon item">📦</div>
            <div class="summary-content">
              <span class="summary-value">{{ dashboardData.itemStats.total }}</span>
              <span class="summary-label">藏品总数</span>
            </div>
            <div class="summary-detail">
              <span class="detail-item"><span class="dot active"></span>{{ dashboardData.itemStats.active }} 在拍</span>
              <span class="detail-item"><span class="dot sold"></span>{{ dashboardData.itemStats.sold }} 已售</span>
            </div>
          </div>

          <div class="summary-card card">
            <div class="summary-icon sale">💰</div>
            <div class="summary-content">
              <span class="summary-value">¥{{ formatNumber(dashboardData.salesStats.totalSalesAmount) }}</span>
              <span class="summary-label">成交总金额</span>
            </div>
            <div class="summary-detail">
              <span class="detail-item">完成 {{ dashboardData.salesStats.completedOrders }} 单</span>
              <span class="detail-item">均价 ¥{{ formatNumber(Math.round(dashboardData.salesStats.averageOrderAmount)) }}</span>
            </div>
          </div>

          <div class="summary-card card">
            <div class="summary-icon view">👁️</div>
            <div class="summary-content">
              <span class="summary-value">{{ formatNumber(dashboardData.totalViews) }}</span>
              <span class="summary-label">总浏览量</span>
            </div>
            <div class="summary-detail">
              <span class="detail-item">❤️ {{ formatNumber(dashboardData.totalLikes) }} 喜欢</span>
              <span class="detail-item">🏷️ {{ formatNumber(dashboardData.totalBidCount) }} 出价</span>
            </div>
          </div>

          <div class="summary-card card">
            <div class="summary-icon user">👥</div>
            <div class="summary-content">
              <span class="summary-value">{{ dashboardData.userCount }}</span>
              <span class="summary-label">注册用户</span>
            </div>
            <div class="summary-detail">
              <span class="detail-item">📋 {{ dashboardData.salesStats.totalOrders }} 总订单</span>
              <span class="detail-item">❌ {{ dashboardData.salesStats.cancelledOrders }} 已取消</span>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-section card">
            <h2 class="section-title">藏品状态分布</h2>
            <div class="status-bars">
              <div class="status-bar-item" v-for="(status, key) in itemStatusList" :key="key">
                <div class="status-bar-label">
                  <span class="status-label-text">{{ status.label }}</span>
                  <span class="status-count">{{ status.count }}</span>
                </div>
                <div class="status-bar-track">
                  <div
                    class="status-bar-fill"
                    :class="key"
                    :style="{ width: status.percentage + '%' }"
                  ></div>
                </div>
                <span class="status-percentage">{{ status.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <div class="dashboard-section card">
            <h2 class="section-title">热门情绪排行</h2>
            <div class="emotion-list">
              <div
                class="emotion-item"
                v-for="(emotion, index) in topEmotions"
                :key="emotion.tag"
              >
                <div class="emotion-rank" :class="getRankClass(index)">
                  {{ index + 1 }}
                </div>
                <div class="emotion-info">
                  <div class="emotion-header">
                    <span class="emotion-tag">{{ emotion.tag }}</span>
                    <span class="emotion-count">{{ emotion.count }} 件藏品</span>
                  </div>
                  <div class="emotion-bar-track">
                    <div
                      class="emotion-bar-fill"
                      :style="{ width: emotion.percentage + '%' }"
                    ></div>
                  </div>
                </div>
                <span class="emotion-percentage">{{ emotion.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-section card trend-section">
          <div class="section-header">
            <h2 class="section-title">访问与交易趋势</h2>
            <div class="trend-legend">
              <span class="legend-item"><span class="legend-dot views"></span>浏览量</span>
              <span class="legend-item"><span class="legend-dot items"></span>新增藏品</span>
              <span class="legend-item"><span class="legend-dot orders"></span>新增订单</span>
            </div>
          </div>
          <div class="trend-chart">
            <div class="trend-y-axis">
              <span v-for="(tick, i) in yAxisTicks" :key="i">{{ tick }}</span>
            </div>
            <div class="trend-content">
              <div class="trend-bars">
                <div
                  class="trend-bar-group"
                  v-for="item in dashboardData.visitTrend"
                  :key="item.date"
                  @mouseenter="activeTrend = item"
                  @mouseleave="activeTrend = null"
                >
                  <div class="trend-bar views" :style="{ height: getBarHeight(item.views, 'views') + '%' }"></div>
                  <div class="trend-bar items" :style="{ height: getBarHeight(item.items, 'items') + '%' }"></div>
                  <div class="trend-bar orders" :style="{ height: getBarHeight(item.orders, 'orders') + '%' }"></div>
                </div>
              </div>
              <div class="trend-x-axis">
                <span
                  v-for="(item, i) in dashboardData.visitTrend"
                  :key="item.date"
                  v-show="shouldShowXLabel(i)"
                >
                  {{ formatDateShort(item.date) }}
                </span>
              </div>
            </div>
            <div v-if="activeTrend" class="trend-tooltip">
              <div class="tooltip-date">{{ formatDate(activeTrend.date) }}</div>
              <div class="tooltip-row"><span class="legend-dot views"></span>浏览：{{ activeTrend.views }}</div>
              <div class="tooltip-row"><span class="legend-dot items"></span>藏品：{{ activeTrend.items }}</div>
              <div class="tooltip-row"><span class="legend-dot orders"></span>订单：{{ activeTrend.orders }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dashboardApi } from '@/api'
import type { DashboardData, DashboardVisitTrend } from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const dashboardData = ref<DashboardData | null>(null)
const trendDays = ref(30)
const activeTrend = ref<DashboardVisitTrend | null>(null)

interface StatusItem {
  label: string
  count: number
  percentage: number
}

const itemStatusList = computed<Record<string, StatusItem>>(() => {
  if (!dashboardData.value) {
    return {
      active: { label: '正在拍卖', count: 0, percentage: 0 },
      sold: { label: '已成交', count: 0, percentage: 0 },
      scheduled: { label: '定时上架', count: 0, percentage: 0 },
      draft: { label: '草稿箱', count: 0, percentage: 0 },
      archived: { label: '已下架', count: 0, percentage: 0 }
    }
  }
  const stats = dashboardData.value.itemStats
  const total = stats.total || 1
  return {
    active: { label: '正在拍卖', count: stats.active, percentage: (stats.active / total) * 100 },
    sold: { label: '已成交', count: stats.sold, percentage: (stats.sold / total) * 100 },
    scheduled: { label: '定时上架', count: stats.scheduled, percentage: (stats.scheduled / total) * 100 },
    draft: { label: '草稿箱', count: stats.draft, percentage: (stats.draft / total) * 100 },
    archived: { label: '已下架', count: stats.archived, percentage: (stats.archived / total) * 100 }
  }
})

const topEmotions = computed(() => {
  if (!dashboardData.value) return []
  return dashboardData.value.emotionStats.slice(0, 5)
})

const maxValues = computed(() => {
  if (!dashboardData.value) return { views: 1, items: 1, orders: 1 }
  const trend = dashboardData.value.visitTrend
  return {
    views: Math.max(1, ...trend.map(t => t.views)),
    items: Math.max(1, ...trend.map(t => t.items)),
    orders: Math.max(1, ...trend.map(t => t.orders))
  }
})

const yAxisTicks = computed(() => {
  const max = maxValues.value.views
  const step = Math.ceil(max / 4)
  return [step * 4, step * 3, step * 2, step, 0]
})

async function fetchData() {
  loading.value = true
  try {
    const response = await dashboardApi.getOverview(trendDays.value)
    dashboardData.value = response.data as DashboardData
  } catch (e) {
    console.error('获取看板数据失败', e)
  } finally {
    loading.value = false
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY年MM月DD日')
}

function formatDateShort(dateStr: string): string {
  return dayjs(dateStr).format('MM/DD')
}

function getRankClass(index: number): string {
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return 'rank-other'
}

function getBarHeight(value: number, type: 'views' | 'items' | 'orders'): number {
  const max = maxValues.value[type]
  return (value / max) * 85
}

function shouldShowXLabel(index: number): boolean {
  const total = dashboardData.value?.visitTrend.length || 0
  const step = Math.ceil(total / 7)
  return index % step === 0
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard-view {
  padding: 2rem 0;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  color: var(--color-text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.trend-select {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
}

.trend-select:focus {
  border-color: var(--color-primary);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  opacity: 0.6;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(99, 102, 241, 0.1);
}

.summary-icon.item { background: rgba(99, 102, 241, 0.15); }
.summary-icon.sale { background: rgba(34, 197, 94, 0.15); }
.summary-icon.view { background: rgba(14, 165, 233, 0.15); }
.summary-icon.user { background: rgba(245, 158, 11, 0.15); }

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.summary-detail {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot.active { background: #22c55e; }
.dot.sold { background: var(--color-primary); }

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-section {
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 1.25rem 0;
}

.section-header .section-title {
  margin: 0;
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-bar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-bar-label {
  min-width: 80px;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.status-label-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.status-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.status-bar-track {
  flex: 1;
  height: 8px;
  background: var(--color-background);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.status-bar-fill.active { background: linear-gradient(90deg, #22c55e, #16a34a); }
.status-bar-fill.sold { background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); }
.status-bar-fill.scheduled { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
.status-bar-fill.draft { background: linear-gradient(90deg, #f59e0b, #d97706); }
.status-bar-fill.archived { background: linear-gradient(90deg, #64748b, #475569); }

.status-percentage {
  min-width: 50px;
  text-align: right;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.emotion-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.emotion-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--color-background);
  color: var(--color-text-secondary);
}

.emotion-rank.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.emotion-rank.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: white;
}

.emotion-rank.rank-3 {
  background: linear-gradient(135deg, #fb923c, #ea580c);
  color: white;
}

.emotion-info {
  flex: 1;
  min-width: 0;
}

.emotion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.emotion-tag {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.emotion-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.emotion-bar-track {
  height: 6px;
  background: var(--color-background);
  border-radius: 3px;
  overflow: hidden;
}

.emotion-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.emotion-percentage {
  min-width: 50px;
  text-align: right;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.trend-section {
  position: relative;
}

.trend-legend {
  display: flex;
  gap: 1.25rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.legend-dot.views { background: #0ea5e9; }
.legend-dot.items { background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); }
.legend-dot.orders { background: #22c55e; }

.trend-chart {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  position: relative;
}

.trend-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 0.5rem 1.5rem 0;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-align: right;
  min-width: 36px;
  font-variant-numeric: tabular-nums;
  height: 220px;
}

.trend-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 220px;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.trend-bar-group {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  cursor: pointer;
  padding: 0 2px;
  transition: opacity 0.2s ease;
}

.trend-bar-group:hover {
  opacity: 0.85;
}

.trend-bar {
  flex: 1;
  min-width: 0;
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;
  min-height: 2px;
}

.trend-bar.views { background: linear-gradient(180deg, #38bdf8, #0ea5e9); }
.trend-bar.items { background: linear-gradient(180deg, var(--color-primary), var(--color-secondary)); }
.trend-bar.orders { background: linear-gradient(180deg, #4ade80, #22c55e); }

.trend-x-axis {
  display: flex;
  gap: 4px;
  padding-top: 0.5rem;
}

.trend-x-axis span {
  flex: 1;
  text-align: center;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.trend-tooltip {
  position: absolute;
  top: 3.5rem;
  right: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.8rem;
  z-index: 10;
  min-width: 160px;
}

.tooltip-date {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  color: var(--color-text-secondary);
}

.card {
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border);
}

@media (max-width: 968px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .trend-y-axis {
    display: none;
  }

  .trend-tooltip {
    position: fixed;
    top: auto;
    right: auto;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
  }
}
</style>
