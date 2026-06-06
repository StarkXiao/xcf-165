<template>
  <div class="orders-view">
    <div class="container">
      <div class="orders-header">
        <div>
          <h1 class="page-title">我的订单</h1>
          <p class="page-subtitle">查看和管理你的订单</p>
        </div>
      </div>

      <div class="orders-tabs">
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'all' }"
          @click="handleStatusFilter('all')"
        >
          全部
          <span v-if="orderStore.stats" class="tab-count">{{ orderStore.stats.total }}</span>
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'pending' }"
          @click="handleStatusFilter('pending')"
        >
          待确认
          <span v-if="orderStore.stats?.pending" class="tab-badge">{{ orderStore.stats.pending }}</span>
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'confirmed' }"
          @click="handleStatusFilter('confirmed')"
        >
          待付款
          <span v-if="orderStore.stats?.confirmed" class="tab-badge">{{ orderStore.stats.confirmed }}</span>
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'paid' }"
          @click="handleStatusFilter('paid')"
        >
          待发货
          <span v-if="orderStore.stats?.paid" class="tab-badge">{{ orderStore.stats.paid }}</span>
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'shipped' }"
          @click="handleStatusFilter('shipped')"
        >
          待收货
          <span v-if="orderStore.stats?.shipped" class="tab-badge">{{ orderStore.stats.shipped }}</span>
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'completed' }"
          @click="handleStatusFilter('completed')"
        >
          已完成
        </button>
        <button
          class="order-tab"
          :class="{ active: currentStatus === 'cancelled' }"
          @click="handleStatusFilter('cancelled')"
        >
          已取消
        </button>
      </div>

      <div v-if="orderStore.loading && orderStore.orders.length === 0" class="loading">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="orderStore.orders.length === 0" class="empty">
        <div class="empty-icon">📦</div>
        <p>{{ emptyText }}</p>
        <router-link to="/" class="btn btn-primary">去逛逛</router-link>
      </div>

      <div v-else class="orders-list">
        <div
          v-for="order in orderStore.orders"
          :key="order.id"
          class="order-card card"
        >
          <div class="order-header">
            <div class="order-meta">
              <span class="order-id">订单号：{{ order.id.slice(0, 12) }}...</span>
              <span class="order-time">{{ formatDateTime(order.createdAt) }}</span>
            </div>
            <span
              class="order-status"
              :style="{ color: ORDER_STATUS_COLOR[order.status], background: ORDER_STATUS_COLOR[order.status] + '15' }"
            >
              {{ ORDER_STATUS_LABEL[order.status] }}
            </span>
          </div>

          <div class="order-body">
            <div class="order-item">
              <div class="item-thumb">
                <img :src="order.itemImageUrl || placeholderImage" :alt="order.itemTitle" />
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ order.itemTitle }}</h3>
                <p class="item-price">¥{{ order.price }}</p>
              </div>
            </div>

            <div class="order-details">
              <div class="detail-row" v-if="order.buyerName">
                <span class="detail-label">收件人</span>
                <span class="detail-value">{{ order.buyerName }}</span>
              </div>
              <div class="detail-row" v-if="order.buyerPhone">
                <span class="detail-label">电话</span>
                <span class="detail-value">{{ order.buyerPhone }}</span>
              </div>
              <div class="detail-row" v-if="order.buyerAddress">
                <span class="detail-label">地址</span>
                <span class="detail-value">{{ order.buyerAddress }}</span>
              </div>
              <div class="detail-row" v-if="order.remark">
                <span class="detail-label">备注</span>
                <span class="detail-value">{{ order.remark }}</span>
              </div>
            </div>
          </div>

          <div class="order-footer">
            <div class="order-total">
              <span>合计：</span>
              <strong class="total-price">¥{{ order.price }}</strong>
            </div>
            <div class="order-actions">
              <button
                v-if="order.status === 'confirmed'"
                class="btn btn-primary btn-sm"
                @click="handleMarkPaid(order)"
              >
                确认付款
              </button>
              <button
                v-if="order.status === 'shipped'"
                class="btn btn-success btn-sm"
                @click="handleComplete(order)"
              >
                确认收货
              </button>
              <button
                v-if="order.status === 'pending' || order.status === 'confirmed'"
                class="btn btn-danger btn-sm"
                @click="handleCancel(order)"
              >
                取消订单
              </button>
              <router-link
                :to="`/item/${order.itemId}`"
                class="btn btn-secondary btn-sm"
              >
                查看藏品
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div v-if="orderStore.hasMore && !orderStore.loading" class="load-more">
        <button class="btn btn-secondary" @click="handleLoadMore">
          加载更多
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, type Order, type OrderStatus } from '@/types'
import dayjs from 'dayjs'

const orderStore = useOrderStore()

const currentStatus = ref<string>('all')
const placeholderImage = 'https://picsum.photos/seed/empty/200/200'

const emptyText = computed(() => {
  if (currentStatus.value === 'all') return '还没有订单'
  return `没有${ORDER_STATUS_LABEL[currentStatus.value as OrderStatus] || ''}的订单`
})

onMounted(async () => {
  await orderStore.fetchStats()
  await fetchOrders()
})

function formatDateTime(date: string) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function fetchOrders() {
  const params: Record<string, unknown> = { role: 'buyer' }
  if (currentStatus.value !== 'all') {
    params.status = currentStatus.value
  }
  await orderStore.fetchOrders(params)
}

function handleStatusFilter(status: string) {
  currentStatus.value = status
  fetchOrders()
}

function handleLoadMore() {
  orderStore.fetchMoreOrders()
}

async function handleMarkPaid(order: Order) {
  if (!confirm(`确认已付款 ¥${order.price}？`)) return
  try {
    await orderStore.markOrderPaid(order.id)
    alert('已标记为已付款')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}

async function handleComplete(order: Order) {
  if (!confirm('确认已收到商品？')) return
  try {
    await orderStore.completeOrder(order.id)
    alert('订单已完成')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}

async function handleCancel(order: Order) {
  if (!confirm('确定要取消该订单吗？')) return
  try {
    await orderStore.cancelOrder(order.id)
    alert('订单已取消')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}
</script>

<style scoped>
.orders-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--color-text-secondary);
}

.orders-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.order-tab {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.order-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.order-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tab-count {
  opacity: 0.8;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.order-tab:not(.active) .tab-badge {
  background: var(--color-accent);
  color: white;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  padding: 0;
  overflow: hidden;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.order-id {
  font-family: monospace;
}

.order-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.order-body {
  display: flex;
  gap: 1.5rem;
  padding: 1.25rem;
}

.order-item {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.item-thumb {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-surface);
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-price {
  font-size: 0.875rem;
  color: var(--color-accent);
  font-weight: 500;
}

.order-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.detail-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 60px;
}

.detail-value {
  color: var(--color-text);
  word-break: break-all;
}

.order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
  gap: 1rem;
}

.order-total {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
}

.total-price {
  color: var(--color-accent);
  font-size: 1.25rem;
  font-weight: 700;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-success {
  background: #22c55e;
  color: white;
  border: 1px solid #22c55e;
}

.btn-success:hover {
  background: #16a34a;
  border-color: #16a34a;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: 1px solid #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
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

.load-more {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .order-body {
    flex-direction: column;
  }

  .order-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .order-actions {
    width: 100%;
  }

  .order-actions .btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
