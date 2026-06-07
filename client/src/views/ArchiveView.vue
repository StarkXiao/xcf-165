<template>
  <div class="archive-view">
    <div class="container">
      <div class="archive-header">
        <div>
          <h1 class="page-title">成交归档</h1>
          <p class="page-subtitle">记录每件藏品的最终去向和告别寄语</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" @click="handleExport">
            📥 导出CSV
          </button>
          <button class="btn btn-secondary" @click="showCreateModal = true">
            ➕ 新建归档
          </button>
        </div>
      </div>

      <div v-if="stats" class="stats-cards">
        <div class="stats-card">
          <div class="stats-value">{{ stats.total }}</div>
          <div class="stats-label">总归档数</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">¥{{ formatPrice(stats.totalSalesAmount) }}</div>
          <div class="stats-label">总成交金额</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">¥{{ formatPrice(stats.averagePrice) }}</div>
          <div class="stats-label">平均价格</div>
        </div>
      </div>

      <div class="filter-bar card">
        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">搜索</label>
            <input
              type="text"
              class="form-input"
              placeholder="搜索藏品、买家、去向..."
              v-model="filters.keyword"
              @input="handleFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">分类</label>
            <select class="form-select" v-model="filters.category" @change="handleFilterChange">
              <option value="">全部分类</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">情绪标签</label>
            <select class="form-select" v-model="filters.emotionTag" @change="handleFilterChange">
              <option value="">全部情绪</option>
              <option v-for="tag in emotionTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-group">
            <label class="filter-label">起始日期</label>
            <input
              type="date"
              class="form-input"
              v-model="filters.startDate"
              @change="handleFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">结束日期</label>
            <input
              type="date"
              class="form-input"
              v-model="filters.endDate"
              @change="handleFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">最低价格</label>
            <input
              type="number"
              class="form-input"
              placeholder="最低价"
              v-model.number="filters.minPrice"
              @input="handleFilterChange"
              min="0"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">最高价格</label>
            <input
              type="number"
              class="form-input"
              placeholder="最高价"
              v-model.number="filters.maxPrice"
              @input="handleFilterChange"
              min="0"
            />
          </div>

          <div class="filter-group filter-actions">
            <button class="btn btn-ghost" @click="handleReset">重置</button>
          </div>
        </div>
      </div>

      <div v-if="loading && archives.length === 0" class="loading">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="archives.length === 0" class="empty">
        <div class="empty-icon">📦</div>
        <p>还没有成交归档</p>
        <button class="btn btn-primary" @click="showCreateModal = true">
          创建第一个归档
        </button>
      </div>

      <div v-else class="archive-list">
        <div
          v-for="archive in archives"
          :key="archive.id"
          class="archive-card card"
        >
          <div class="archive-main">
            <div class="archive-item">
              <div class="item-thumb">
                <img :src="archive.itemImageUrl || placeholderImage" :alt="archive.itemTitle" />
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ archive.itemTitle }}</h3>
                <div class="item-meta">
                  <span v-if="archive.category" class="meta-tag">{{ archive.category }}</span>
                  <span
                    v-for="tag in parseTags(archive.emotionTags)"
                    :key="tag"
                    class="meta-tag emotion"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="archive-time">
                  归档于 {{ formatDateTime(archive.archivedAt) }}
                </div>
              </div>
            </div>

            <div class="archive-details">
              <div class="detail-item">
                <span class="detail-label">👤 买家</span>
                <span class="detail-value">{{ archive.buyerName || '未知' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">📍 去向</span>
                <span class="detail-value">{{ archive.destination || '未填写' }}</span>
              </div>
              <div class="detail-item price">
                <span class="detail-label">💰 成交价</span>
                <span class="detail-value">¥{{ formatPrice(archive.finalPrice) }}</span>
              </div>
            </div>
          </div>

          <div v-if="archive.farewellMessage" class="archive-message">
            <div class="message-label">💌 告别寄语</div>
            <div class="message-content">{{ archive.farewellMessage }}</div>
          </div>

          <div class="archive-actions">
            <button class="btn btn-secondary btn-sm" @click="handleEdit(archive)">
              编辑
            </button>
            <button class="btn btn-danger btn-sm" @click="handleDelete(archive)">
              删除
            </button>
          </div>
        </div>
      </div>

      <div v-if="hasMore && !loading" class="load-more">
        <button class="btn btn-secondary" @click="handleLoadMore">
          加载更多
        </button>
      </div>
    </div>

    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal card">
        <div class="modal-header">
          <h2>{{ showEditModal ? '编辑归档' : '新建成交归档' }}</h2>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">藏品ID *</label>
            <input
              type="text"
              class="form-input"
              v-model="form.itemId"
              placeholder="输入藏品ID"
              :disabled="showEditModal"
            />
          </div>

          <div class="form-group">
            <label class="form-label">买家姓名</label>
            <input
              type="text"
              class="form-input"
              v-model="form.buyerName"
              placeholder="输入买家姓名"
            />
          </div>

          <div class="form-group">
            <label class="form-label">物品去向</label>
            <input
              type="text"
              class="form-input"
              v-model="form.destination"
              placeholder="例如：北京市朝阳区或收件地址"
            />
          </div>

          <div class="form-group">
            <label class="form-label">成交价格</label>
            <input
              type="number"
              class="form-input"
              v-model.number="form.finalPrice"
              placeholder="输入成交价格"
              min="0"
            />
          </div>

          <div class="form-group">
            <label class="form-label">告别寄语</label>
            <textarea
              class="form-textarea"
              v-model="form.farewellMessage"
              placeholder="写下你对这件藏品最后的寄语..."
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { salesArchiveApi } from '@/api'
import { CATEGORIES, EMOTION_TAGS, type SalesArchive, type SalesArchiveCreate, type SalesArchiveUpdate, type SalesArchiveStats, type SalesArchiveQueryParams } from '@/types'
import dayjs from 'dayjs'

const placeholderImage = 'https://picsum.photos/seed/empty/200/200'
const categories = [...CATEGORIES]
const emotionTags = [...EMOTION_TAGS]

const archives = ref<SalesArchive[]>([])
const stats = ref<SalesArchiveStats | null>(null)
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)
const hasMore = computed(() => page.value < totalPages.value)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingId = ref<string | null>(null)
const submitting = ref(false)

const filters = reactive<SalesArchiveQueryParams>({
  keyword: '',
  category: '',
  emotionTag: '',
  startDate: '',
  endDate: '',
  minPrice: undefined,
  maxPrice: undefined
})

const form = reactive<SalesArchiveCreate>({
  itemId: '',
  buyerName: '',
  destination: '',
  finalPrice: 0,
  farewellMessage: ''
})

function formatPrice(price: number): string {
  return price.toFixed(2).replace(/\.00$/, '')
}

function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function parseTags(tags: string): string[] {
  return tags ? tags.split(',').filter(Boolean) : []
}

async function fetchStats() {
  try {
    const res = await salesArchiveApi.getStats()
    stats.value = res.data
  } catch (e) {
    console.error('获取统计数据失败:', e)
  }
}

async function fetchArchives(reset = false) {
  if (reset) {
    page.value = 1
    archives.value = []
  }

  loading.value = true
  try {
    const params: SalesArchiveQueryParams = {
      page: page.value,
      pageSize,
      ...filters
    }
    const res = await salesArchiveApi.list(params)
    if (reset) {
      archives.value = res.data.data
    } else {
      archives.value = [...archives.value, ...res.data.data]
    }
    totalPages.value = res.data.totalPages
  } catch (e) {
    console.error('获取归档列表失败:', e)
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  fetchArchives(true)
}

function handleReset() {
  filters.keyword = ''
  filters.category = ''
  filters.emotionTag = ''
  filters.startDate = ''
  filters.endDate = ''
  filters.minPrice = undefined
  filters.maxPrice = undefined
  fetchArchives(true)
}

function handleLoadMore() {
  page.value++
  fetchArchives(false)
}

async function handleExport() {
  try {
    const params: SalesArchiveQueryParams = {
      ...filters
    }
    const blob = await salesArchiveApi.exportCsv(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-archives-${dayjs().format('YYYYMMDD-HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出失败:', e)
    alert('导出失败，请重试')
  }
}

function handleEdit(archive: SalesArchive) {
  editingId.value = archive.id
  form.itemId = archive.itemId
  form.buyerName = archive.buyerName
  form.destination = archive.destination || ''
  form.finalPrice = archive.finalPrice
  form.farewellMessage = archive.farewellMessage || ''
  showEditModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingId.value = null
  form.itemId = ''
  form.buyerName = ''
  form.destination = ''
  form.finalPrice = 0
  form.farewellMessage = ''
}

async function handleSubmit() {
  if (!form.itemId.trim()) {
    alert('请输入藏品ID')
    return
  }

  submitting.value = true
  try {
    if (showEditModal.value && editingId.value) {
      const updateData: SalesArchiveUpdate = {
        destination: form.destination || undefined,
        finalPrice: form.finalPrice,
        farewellMessage: form.farewellMessage || undefined
      }
      await salesArchiveApi.update(editingId.value, updateData)
      alert('更新成功')
    } else {
      const createData: SalesArchiveCreate = {
        itemId: form.itemId.trim(),
        buyerName: form.buyerName || undefined,
        destination: form.destination || undefined,
        finalPrice: form.finalPrice,
        farewellMessage: form.farewellMessage || undefined
      }
      await salesArchiveApi.create(createData)
      alert('创建成功')
    }
    closeModal()
    await Promise.all([fetchStats(), fetchArchives(true)])
  } catch (e: any) {
    const msg = e?.response?.data?.message || '操作失败，请重试'
    alert(msg)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(archive: SalesArchive) {
  if (!confirm(`确定要删除归档「${archive.itemTitle}」吗？此操作不可恢复。`)) return
  try {
    await salesArchiveApi.delete(archive.id)
    alert('删除成功')
    await Promise.all([fetchStats(), fetchArchives(true)])
  } catch (e: any) {
    const msg = e?.response?.data?.message || '删除失败，请重试'
    alert(msg)
  }
}

onMounted(async () => {
  await Promise.all([fetchStats(), fetchArchives(true)])
})
</script>

<style scoped>
.archive-view {
  min-height: 100vh;
  padding: 2rem 0;
}

.archive-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
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

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stats-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.stats-value {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.stats-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.filter-bar {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.filter-actions {
  justify-content: flex-end;
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.archive-card {
  padding: 0;
  overflow: hidden;
}

.archive-main {
  display: flex;
  gap: 1.5rem;
  padding: 1.25rem;
  flex-wrap: wrap;
}

.archive-item {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-width: 280px;
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
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.item-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.meta-tag {
  padding: 0.125rem 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.meta-tag.emotion {
  background: linear-gradient(135deg, var(--color-primary) + '15', var(--color-secondary) + '15');
  border-color: var(--color-primary) + '30';
  color: var(--color-primary);
}

.archive-time {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.archive-details {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.price .detail-value {
  color: var(--color-accent);
  font-size: 1.25rem;
  font-weight: 700;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.detail-value {
  font-size: 0.9375rem;
  color: var(--color-text);
  font-weight: 500;
}

.archive-message {
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.message-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.375rem;
}

.message-content {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.6;
  font-style: italic;
}

.archive-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  justify-content: flex-end;
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

.modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9375rem;
  color: var(--color-text);
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-background);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
}

@media (max-width: 768px) {
  .archive-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }

  .archive-main {
    flex-direction: column;
  }

  .archive-details {
    width: 100%;
    justify-content: space-between;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }
}
</style>
