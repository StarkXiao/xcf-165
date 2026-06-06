<template>
  <div class="manage-view">
    <div class="container">
      <div class="manage-tabs">
        <button
          class="manage-tab"
          :class="{ active: activeTab === 'items' }"
          @click="activeTab = 'items'"
        >
          📦 藏品管理
        </button>
        <button
          class="manage-tab"
          :class="{ active: activeTab === 'orders' }"
          @click="switchToOrders"
        >
          🛒 订单管理
        </button>
      </div>

      <div v-if="activeTab === 'items'">
        <div class="manage-header">
          <div>
            <h1 class="page-title">藏品管理</h1>
            <p class="page-subtitle">管理你的分手遗物，讲述它们的故事</p>
          </div>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <span>+</span>
            上架新藏品
          </button>
        </div>

        <div class="manage-stats" v-if="itemStore.stats">
          <div class="stat-card">
            <span class="stat-icon">📦</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.total }}</span>
              <span class="stat-label">藏品总数</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📝</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.draft }}</span>
              <span class="stat-label">草稿箱</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⏰</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.scheduled }}</span>
              <span class="stat-label">定时上架</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🔄</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.active }}</span>
              <span class="stat-label">正在拍卖</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.sold }}</span>
              <span class="stat-label">已成交</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💰</span>
            <div class="stat-content">
              <span class="stat-value">¥{{ itemStore.stats.highestPrice.toFixed(0) }}</span>
              <span class="stat-label">当前最高价</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💵</span>
            <div class="stat-content">
              <span class="stat-value">¥{{ itemStore.stats.totalSoldAmount.toFixed(0) }}</span>
              <span class="stat-label">成交流转总额</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🏷️</span>
            <div class="stat-content">
              <span class="stat-value">{{ itemStore.stats.totalBidCount }}</span>
              <span class="stat-label">总出价次数</span>
            </div>
          </div>
        </div>

        <div class="manage-filters">
          <div class="filter-group">
            <label class="filter-label">状态筛选</label>
            <div class="filter-tabs">
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'all' }"
                @click="handleStatusFilter('all')"
              >
                全部
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'draft' }"
                @click="handleStatusFilter('draft')"
              >
                草稿箱
                <span v-if="itemStore.stats?.draft" class="tab-badge">{{ itemStore.stats.draft }}</span>
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'scheduled' }"
                @click="handleStatusFilter('scheduled')"
              >
                定时上架
                <span v-if="itemStore.stats?.scheduled" class="tab-badge">{{ itemStore.stats.scheduled }}</span>
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'active' }"
                @click="handleStatusFilter('active')"
              >
                正在拍卖
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'sold' }"
                @click="handleStatusFilter('sold')"
              >
                已成交
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentStatus === 'archived' }"
                @click="handleStatusFilter('archived')"
              >
                已下架
              </button>
            </div>
          </div>
        </div>

        <div v-if="itemStore.loading && itemStore.items.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="itemStore.items.length === 0" class="empty">
          <div class="empty-icon">{{ emptyIcon }}</div>
          <p>{{ emptyText }}</p>
          <p class="empty-hint">{{ emptyHint }}</p>
        </div>

        <div v-else class="items-list">
          <div
            v-for="item in itemStore.items"
            :key="item.id"
            class="item-row card"
          >
            <div class="item-thumb">
              <img :src="item.imageUrl || placeholderImage" :alt="item.title" />
            </div>
            <div class="item-info">
              <div class="item-title-row">
                <h3 class="item-title">{{ item.title || '（未命名草稿）' }}</h3>
                <span class="item-status" :class="item.status">
                  {{ statusMap[item.status] }}
                </span>
              </div>
              <p class="item-desc">{{ item.description || '暂无描述' }}</p>
              <div class="item-meta">
                <span v-if="item.price" class="meta-item">起拍价 ¥{{ item.price }}</span>
                <span class="meta-item price-current" v-if="item.currentPrice && item.status === 'active'">
                  当前价 <strong>¥{{ item.currentPrice }}</strong>
                </span>
                <span class="meta-item" v-if="item.soldPrice">
                  成交价 <strong class="text-success">¥{{ item.soldPrice }}</strong>
                </span>
                <span class="meta-item" v-if="item.scheduledAt">
                  ⏰ {{ formatScheduledAt(item.scheduledAt) }}上架
                </span>
                <span v-if="item.category" class="meta-item">{{ item.category }}</span>
                <span v-if="item.bidCount" class="meta-item">🏷️ {{ item.bidCount }} 次出价</span>
                <span class="meta-item">👁️ {{ item.views }}</span>
                <span class="meta-item">❤️ {{ item.likes }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button
                v-if="item.status === 'draft'"
                class="btn btn-primary btn-sm"
                @click="handleEdit(item)"
              >
                编辑上架
              </button>
              <button
                v-if="item.status === 'scheduled'"
                class="btn btn-success btn-sm"
                @click="handlePublishNow(item)"
              >
                立即上架
              </button>
              <button
                v-if="item.status === 'active'"
                class="btn btn-success btn-sm"
                @click="handleMarkSold(item)"
              >
                标记成交
              </button>
              <button class="btn btn-secondary btn-sm" @click="handleEdit(item)">
                编辑
              </button>
              <button class="btn btn-danger btn-sm" @click="handleDelete(item)">
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="itemStore.hasMore && !itemStore.loading" class="load-more">
          <button class="btn btn-secondary" @click="handleLoadMore">
            加载更多
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'orders'">
        <div class="manage-header">
          <div>
            <h1 class="page-title">订单管理</h1>
            <p class="page-subtitle">管理收到的订单，处理交易流程</p>
          </div>
        </div>

        <div class="manage-stats" v-if="orderStore.stats">
          <div class="stat-card">
            <span class="stat-icon">🛒</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.total }}</span>
              <span class="stat-label">订单总数</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⏳</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.pending }}</span>
              <span class="stat-label">待确认</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💳</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.confirmed }}</span>
              <span class="stat-label">待付款</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📦</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.paid }}</span>
              <span class="stat-label">待发货</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🚚</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.shipped }}</span>
              <span class="stat-label">已发货</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">✅</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.completed }}</span>
              <span class="stat-label">已完成</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💵</span>
            <div class="stat-content">
              <span class="stat-value">¥{{ orderStore.stats.totalAmount.toFixed(0) }}</span>
              <span class="stat-label">已完成总额</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">❌</span>
            <div class="stat-content">
              <span class="stat-value">{{ orderStore.stats.cancelled }}</span>
              <span class="stat-label">已取消</span>
            </div>
          </div>
        </div>

        <div class="manage-filters">
          <div class="filter-group">
            <label class="filter-label">订单状态</label>
            <div class="filter-tabs">
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'all' }"
                @click="handleOrderStatusFilter('all')"
              >
                全部
                <span v-if="orderStore.stats" class="tab-count">{{ orderStore.stats.total }}</span>
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'pending' }"
                @click="handleOrderStatusFilter('pending')"
              >
                待确认
                <span v-if="orderStore.stats?.pending" class="tab-badge">{{ orderStore.stats.pending }}</span>
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'confirmed' }"
                @click="handleOrderStatusFilter('confirmed')"
              >
                待付款
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'paid' }"
                @click="handleOrderStatusFilter('paid')"
              >
                待发货
                <span v-if="orderStore.stats?.paid" class="tab-badge">{{ orderStore.stats.paid }}</span>
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'shipped' }"
                @click="handleOrderStatusFilter('shipped')"
              >
                已发货
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'completed' }"
                @click="handleOrderStatusFilter('completed')"
              >
                已完成
              </button>
              <button
                class="filter-tab"
                :class="{ active: currentOrderStatus === 'cancelled' }"
                @click="handleOrderStatusFilter('cancelled')"
              >
                已取消
              </button>
            </div>
          </div>
        </div>

        <div v-if="orderStore.loading && orderStore.orders.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="orderStore.orders.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <p>暂无订单</p>
          <p class="empty-hint">有买家下单后会在这里显示</p>
        </div>

        <div v-else class="orders-list">
          <div
            v-for="order in orderStore.orders"
            :key="order.id"
            class="order-card card"
          >
            <div class="order-header">
              <div class="order-meta">
                <span class="order-id">订单号：{{ order.id.slice(0, 16) }}...</span>
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
                <div class="detail-row">
                  <span class="detail-label">买家</span>
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
                <span>订单金额：</span>
                <strong class="total-price">¥{{ order.price }}</strong>
              </div>
              <div class="order-actions">
                <button
                  v-if="canDo(order, 'confirm')"
                  class="btn btn-primary btn-sm"
                  @click="handleConfirmOrder(order)"
                >
                  确认订单
                </button>
                <button
                  v-if="canDo(order, 'markShipped')"
                  class="btn btn-success btn-sm"
                  @click="handleShipOrder(order)"
                >
                  标记发货
                </button>
                <button
                  v-if="canDo(order, 'cancel')"
                  class="btn btn-danger btn-sm"
                  @click="handleCancelOrder(order)"
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
          <button class="btn btn-secondary" @click="handleLoadMoreOrders">
            加载更多
          </button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>{{ showEditModal ? (editingItem?.status === 'draft' ? '编辑草稿' : '编辑藏品') : '上架新藏品' }}</h2>
              <button class="btn btn-ghost btn-sm" @click="closeModal">
                ✕
              </button>
            </div>
            <div class="modal-body">
              <ItemForm
                :item="showEditModal ? editingItem : null"
                @submit="handleSubmit"
                @submit-draft="handleSubmitDraft"
                @cancel="closeModal"
              />
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import { useOrderStore } from '@/stores/orderStore'
import { useUserStore } from '@/stores/userStore'
import ItemForm from '@/components/ItemForm.vue'
import type { Item, ItemCreate, ItemUpdate, ItemDraftCreate, Order } from '@/types'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, canPerformOrderAction } from '@/types'
import dayjs from 'dayjs'

const itemStore = useItemStore()
const orderStore = useOrderStore()
const userStore = useUserStore()

const activeTab = ref<'items' | 'orders'>('items')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingItem = ref<Item | null>(null)
const currentStatus = ref('all')
const currentOrderStatus = ref<string>('all')
const placeholderImage = 'https://picsum.photos/seed/empty/200/200'

function canDo(order: Order, action: 'confirm' | 'markPaid' | 'markShipped' | 'complete' | 'cancel') {
  const uid = userStore.currentUser?.id
  if (!uid) return false
  return canPerformOrderAction(order, action, uid)
}

const statusMap: Record<string, string> = {
  draft: '草稿',
  scheduled: '定时上架',
  active: '正在拍卖',
  sold: '已成交',
  archived: '已下架'
}

const emptyIcon = computed(() => {
  switch (currentStatus.value) {
    case 'draft': return '📝'
    case 'scheduled': return '⏰'
    case 'sold': return '💰'
    case 'archived': return '📦'
    default: return '📭'
  }
})

const emptyText = computed(() => {
  switch (currentStatus.value) {
    case 'draft': return '还没有草稿'
    case 'scheduled': return '没有定时上架的藏品'
    case 'sold': return '还没有成交的藏品'
    case 'archived': return '还没有下架的藏品'
    default: return '还没有藏品'
  }
})

const emptyHint = computed(() => {
  if (currentStatus.value === 'draft') return '编辑藏品时可以随时保存为草稿'
  if (currentStatus.value === 'all') return '点击上方按钮上架你的第一件藏品'
  return '切换其他状态查看更多藏品'
})

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await itemStore.fetchStats()
  await fetchItems()

  refreshTimer = setInterval(async () => {
    if (currentStatus.value === 'scheduled' || currentStatus.value === 'all') {
      await itemStore.fetchStats()
    }
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

async function switchToOrders() {
  activeTab.value = 'orders'
  await orderStore.fetchStats('seller')
  await fetchOrders()
}

function formatScheduledAt(iso: string): string {
  const d = dayjs(iso)
  const today = dayjs().format('YYYY-MM-DD')
  const targetDay = d.format('YYYY-MM-DD')
  if (today === targetDay) {
    return `今天 ${d.format('HH:mm')}`
  }
  return d.format('MM-DD HH:mm')
}

function formatDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

async function fetchItems() {
  const params: Record<string, unknown> = {}
  if (currentStatus.value !== 'all') {
    params.status = currentStatus.value
  }
  await itemStore.fetchItems(params)
}

async function fetchOrders() {
  const params: Record<string, unknown> = { role: 'seller' }
  if (currentOrderStatus.value !== 'all') {
    params.status = currentOrderStatus.value
  }
  await orderStore.fetchOrders(params)
}

function handleStatusFilter(status: string) {
  currentStatus.value = status
  fetchItems()
}

function handleOrderStatusFilter(status: string) {
  currentOrderStatus.value = status
  fetchOrders()
}

function handleLoadMore() {
  itemStore.fetchMoreItems()
}

function handleLoadMoreOrders() {
  orderStore.fetchMoreOrders()
}

function handleEdit(item: Item) {
  editingItem.value = item
  showEditModal.value = true
}

async function handleDelete(item: Item) {
  const title = item.title || '未命名草稿'
  if (!confirm(`确定要删除「${title}」吗？`)) return
  try {
    await itemStore.deleteItem(item.id)
    await itemStore.fetchStats()
  } catch (e) {
    console.error('删除失败', e)
    alert('删除失败，请重试')
  }
}

async function handleMarkSold(item: Item) {
  const price = item.currentPrice || item.price
  if (!confirm(`确定将「${item.title}」标记为已成交？\n成交价：¥${price}`)) return
  try {
    await itemStore.markItemAsSold(item.id)
    await itemStore.fetchStats()
  } catch (e) {
    console.error('标记成交失败', e)
    alert('标记成交失败，请重试')
  }
}

async function handlePublishNow(item: Item) {
  if (!confirm(`确定将「${item.title || '未命名草稿'}」立即上架吗？`)) return
  try {
    await itemStore.updateItem(item.id, { status: 'active' })
    await itemStore.fetchStats()
    await fetchItems()
  } catch (e) {
    console.error('立即上架失败', e)
    alert('立即上架失败，请重试')
  }
}

async function handleConfirmOrder(order: Order) {
  if (!confirm('确定确认该订单？')) return
  try {
    await orderStore.confirmOrder(order.id)
    await orderStore.fetchStats()
    alert('订单已确认')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}

async function handleShipOrder(order: Order) {
  if (!confirm('确定已发货？')) return
  try {
    await orderStore.markOrderShipped(order.id)
    await orderStore.fetchStats()
    alert('已标记为发货')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}

async function handleCancelOrder(order: Order) {
  if (!confirm('确定取消该订单？')) return
  try {
    await orderStore.cancelOrder(order.id)
    await orderStore.fetchStats()
    alert('订单已取消')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  }
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingItem.value = null
}

async function handleSubmit(data: ItemCreate | ItemUpdate) {
  try {
    if (showEditModal && editingItem.value) {
      await itemStore.updateItem(editingItem.value.id, data)
    } else {
      await itemStore.createItem(data as ItemCreate)
    }
    closeModal()
    await itemStore.fetchStats()
    await fetchItems()
  } catch (e) {
    console.error('保存失败', e)
    alert('保存失败，请重试')
  }
}

async function handleSubmitDraft(data: ItemDraftCreate) {
  try {
    if (showEditModal && editingItem.value) {
      await itemStore.updateItem(editingItem.value.id, { ...data, status: 'draft' })
    } else {
      await itemStore.createDraft(data)
    }
    closeModal()
    await itemStore.fetchStats()
    await fetchItems()
  } catch (e) {
    console.error('保存草稿失败', e)
    alert('保存草稿失败，请重试')
  }
}
</script>

<style scoped>
.manage-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.manage-tab {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manage-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.manage-tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: transparent;
}

.manage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
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

.manage-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.price-current strong {
  color: var(--color-accent);
}

.text-success {
  color: #22c55e !important;
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

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.manage-filters {
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.filter-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-tab.active {
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

.filter-tab:not(.active) .tab-badge {
  background: var(--color-primary);
  color: white;
}

.items-list, .orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
}

.item-thumb {
  width: 100px;
  height: 100px;
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
  flex: 1;
  min-width: 0;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.item-status.draft {
  background: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
}

.item-status.scheduled {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.item-status.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.item-status.sold {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.item-status.archived {
  background: rgba(100, 116, 139, 0.1);
  color: var(--color-text-secondary);
}

.item-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
}

.btn-ghost:hover {
  background: var(--color-surface);
  color: var(--color-text);
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
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
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

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.7;
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

.order-item .item-thumb {
  width: 80px;
  height: 80px;
}

.order-item .item-title {
  font-size: 1rem;
}

.order-item .item-price {
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
  min-width: 50px;
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

@media (max-width: 968px) {
  .manage-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .manage-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .manage-stats {
    grid-template-columns: 1fr 1fr;
  }

  .item-row, .order-body {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-thumb {
    width: 100%;
    height: 200px;
  }

  .order-item .item-thumb {
    width: 100%;
    height: 160px;
  }

  .item-actions, .order-actions, .order-footer {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .item-actions .btn,
  .order-actions .btn {
    width: 100%;
    justify-content: center;
  }

  .order-footer {
    gap: 0.75rem;
  }
}
</style>
