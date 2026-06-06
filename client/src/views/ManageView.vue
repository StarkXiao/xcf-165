<template>
  <div class="manage-view">
    <div class="container">
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
        <div class="empty-icon">📭</div>
        <p>还没有藏品</p>
        <p class="empty-hint">点击上方按钮上架你的第一件藏品</p>
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
              <h3 class="item-title">{{ item.title }}</h3>
              <span class="item-status" :class="item.status">
                {{ statusMap[item.status] }}
              </span>
            </div>
            <p class="item-desc">{{ item.description }}</p>
            <div class="item-meta">
              <span class="meta-item">起拍价 ¥{{ item.price }}</span>
              <span class="meta-item price-current" v-if="item.currentPrice">
                当前价 <strong>¥{{ item.currentPrice }}</strong>
              </span>
              <span class="meta-item" v-if="item.soldPrice">
                成交价 <strong class="text-success">¥{{ item.soldPrice }}</strong>
              </span>
              <span class="meta-item">{{ item.category }}</span>
              <span class="meta-item">🏷️ {{ item.bidCount || 0 }} 次出价</span>
              <span class="meta-item">👁️ {{ item.views }}</span>
              <span class="meta-item">❤️ {{ item.likes }}</span>
            </div>
          </div>
          <div class="item-actions">
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

    <transition name="fade">
      <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ showEditModal ? '编辑藏品' : '上架新藏品' }}</h2>
            <button class="btn btn-ghost btn-sm" @click="closeModal">
              ✕
            </button>
          </div>
          <div class="modal-body">
            <ItemForm
              :item="showEditModal ? editingItem : null"
              @submit="handleSubmit"
              @cancel="closeModal"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import ItemForm from '@/components/ItemForm.vue'
import type { Item, ItemCreate, ItemUpdate } from '@/types'

const itemStore = useItemStore()

const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingItem = ref<Item | null>(null)
const currentStatus = ref('all')
const placeholderImage = 'https://picsum.photos/seed/empty/200/200'

const statusMap: Record<string, string> = {
  active: '正在拍卖',
  sold: '已成交',
  archived: '已下架'
}

onMounted(async () => {
  await itemStore.fetchStats()
  await fetchItems()
})

async function fetchItems() {
  const params: Record<string, unknown> = {}
  if (currentStatus.value !== 'all') {
    params.status = currentStatus.value
  }
  await itemStore.fetchItems(params)
}

function handleStatusFilter(status: string) {
  currentStatus.value = status
  fetchItems()
}

function handleLoadMore() {
  itemStore.fetchMoreItems()
}

function handleEdit(item: Item) {
  editingItem.value = item
  showEditModal.value = true
}

async function handleDelete(item: Item) {
  if (!confirm(`确定要删除「${item.title}」吗？`)) return
  try {
    await itemStore.deleteItem(item.id)
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
    fetchItems()
  } catch (e) {
    console.error('保存失败', e)
    alert('保存失败，请重试')
  }
}
</script>

<style scoped>
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
  grid-template-columns: repeat(3, 1fr);
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

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
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

.items-list {
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

.load-more {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
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
    grid-template-columns: 1fr;
  }

  .item-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-thumb {
    width: 100%;
    height: 200px;
  }

  .item-actions {
    width: 100%;
  }

  .item-actions .btn {
    flex: 1;
  }
}
</style>
