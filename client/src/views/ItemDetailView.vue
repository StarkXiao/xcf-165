<template>
  <div class="item-detail">
    <div class="container">
      <button class="btn btn-ghost back-btn" @click="handleBack">
        <span>←</span>
        返回展墙
      </button>

      <div v-if="itemStore.loading" class="loading">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="!item" class="empty">
        <div class="empty-icon">😢</div>
        <p>藏品不存在或已被移除</p>
      </div>

      <div v-else class="detail-content">
        <div class="detail-image">
          <img :src="item.imageUrl || placeholderImage" :alt="item.title" />
          <div class="detail-status" v-if="item.status !== 'active'">
            {{ statusText }}
          </div>
        </div>

        <div class="detail-info">
          <div class="detail-header">
            <h1 class="detail-title">{{ item.title }}</h1>
            <div class="detail-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ displayPrice }}</span>
            </div>
          </div>

          <div class="price-info" v-if="item.status === 'active'">
            <span class="price-info-item">起拍价：¥{{ item.price }}</span>
            <span class="price-info-item highlight">当前最高价：¥{{ item.currentPrice || item.price }}</span>
            <span class="price-info-item">出价次数：{{ item.bidCount || 0 }}</span>
          </div>
          <div class="price-info" v-else-if="item.status === 'sold'">
            <span class="price-info-item">起拍价：¥{{ item.price }}</span>
            <span class="price-info-item sold">成交价：¥{{ item.soldPrice || item.currentPrice }}</span>
            <span class="price-info-item">出价次数：{{ item.bidCount || 0 }}</span>
          </div>
          <div class="price-info" v-else>
            <span class="price-info-item">起拍价：¥{{ item.price }}</span>
            <span class="price-info-item">最终价：¥{{ item.currentPrice || item.price }}</span>
            <span class="price-info-item">出价次数：{{ item.bidCount || 0 }}</span>
          </div>

          <div class="detail-tags" v-if="emotionTagsList.length > 0">
            <span class="tag" v-for="tag in emotionTagsList" :key="tag">{{ tag }}</span>
          </div>

          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">分类</span>
              <span class="meta-value">{{ item.category || '未分类' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">成色</span>
              <span class="meta-value">{{ item.condition || '未标注' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">浏览</span>
              <span class="meta-value">{{ item.views }} 次</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">发布于</span>
              <span class="meta-value">{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-label">物品描述</h3>
            <p class="section-content">{{ item.description }}</p>
          </div>

          <div class="detail-section">
            <h3 class="section-label">背后的故事</h3>
            <p class="section-content story-content">{{ item.story }}</p>
          </div>

          <div class="detail-section draft-notice-section" v-if="item.status === 'draft'">
            <div class="draft-notice">
              <span class="notice-icon">📝</span>
              <div>
                <h4 class="notice-title">此藏品为草稿</h4>
                <p class="notice-desc">该藏品尚未正式上架，请等待卖家完善信息后发布。</p>
              </div>
            </div>
          </div>

          <div class="detail-section scheduled-notice-section" v-if="item.status === 'scheduled'">
            <div class="scheduled-notice">
              <span class="notice-icon">⏰</span>
              <div>
                <h4 class="notice-title">此藏品即将上架</h4>
                <p class="notice-desc">预计上架时间：{{ item.scheduledAt ? dayjs(item.scheduledAt).format('YYYY年MM月DD日 HH:mm') : '待定' }}</p>
              </div>
            </div>
          </div>

          <div class="detail-section bid-section" v-if="item.status === 'active'">
            <h3 class="section-label">我要出价</h3>
            <div class="bid-form">
              <div class="form-group">
                <label class="form-label">您的昵称</label>
                <input
                  v-model="bidForm.bidder"
                  type="text"
                  class="form-input"
                  placeholder="请输入您的昵称"
                />
              </div>
              <div class="form-group">
                <label class="form-label">出价金额（¥）</label>
                <input
                  v-model.number="bidForm.amount"
                  type="number"
                  class="form-input"
                  :min="minBidAmount"
                  :placeholder="`最低出价 ¥${minBidAmount}`"
                />
              </div>
              <button class="btn btn-primary btn-block" @click="handlePlaceBid" :disabled="bidding">
                {{ bidding ? '出价中...' : '确认出价' }}
              </button>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="section-label">出价记录（{{ itemStore.bids.length }}）</h3>
            <div v-if="itemStore.bidsLoading" class="loading-inline">
              <div class="loading-spinner small"></div>
              <span>加载中...</span>
            </div>
            <div v-else-if="itemStore.bids.length === 0" class="bids-empty">
              暂无出价记录，快来成为第一个出价的人吧！
            </div>
            <div v-else class="bids-list">
              <div
                v-for="(bid, index) in itemStore.bids"
                :key="bid.id"
                class="bid-item"
                :class="{ top: index === 0 }"
              >
                <div class="bid-rank" v-if="index < 3">
                  <span v-if="index === 0">🥇</span>
                  <span v-else-if="index === 1">🥈</span>
                  <span v-else>🥉</span>
                </div>
                <div class="bid-rank num" v-else>{{ index + 1 }}</div>
                <div class="bid-info">
                  <span class="bid-bidder">{{ bid.bidder }}</span>
                  <span class="bid-time">{{ formatDateTime(bid.createdAt) }}</span>
                </div>
                <div class="bid-amount">¥{{ bid.amount }}</div>
              </div>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn btn-primary" @click="handleLike" :disabled="isLiked">
              <span>{{ isLiked ? '❤️' : '🤍' }}</span>
              {{ isLiked ? '已点赞' : '点赞' }}
              <span class="like-count">({{ item.likes }})</span>
            </button>
            <button
              v-if="userStore.isLoggedIn"
              class="btn"
              :class="isFavorited ? 'btn-favorited' : 'btn-secondary'"
              @click="handleToggleFavorite"
            >
              <span>{{ isFavorited ? '💖' : '🤍' }}</span>
              {{ isFavorited ? '已收藏' : '收藏' }}
            </button>
            <router-link to="/manage" class="btn btn-secondary">
              <span>📦</span>
              我也要上架
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useItemStore } from '@/stores/itemStore'
import { useUserStore } from '@/stores/userStore'
import type { Item } from '@/types'

const route = useRoute()
const router = useRouter()
const itemStore = useItemStore()
const userStore = useUserStore()

const isLiked = ref(false)
const isFavorited = ref(false)
const bidding = ref(false)
const placeholderImage = 'https://picsum.photos/seed/empty/800/600'

const bidForm = reactive({
  bidder: '',
  amount: 0
})

const item = computed<Item | null>(() => itemStore.currentItem)

const emotionTagsList = computed(() => {
  return item.value?.emotionTags ? item.value.emotionTags.split(',').filter(Boolean) : []
})

const statusText = computed(() => {
  if (!item.value) return ''
  const map: Record<string, string> = {
    draft: '草稿',
    scheduled: '定时上架',
    sold: '已成交',
    archived: '已下架'
  }
  return map[item.value.status] || ''
})

const displayPrice = computed(() => {
  if (!item.value) return 0
  if (item.value.status === 'sold' && item.value.soldPrice) {
    return item.value.soldPrice
  }
  return item.value.currentPrice || item.value.price
})

const minBidAmount = computed(() => {
  if (!item.value) return 1
  return (item.value.currentPrice || item.value.price) + 1
})

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    await itemStore.fetchItemById(id)
    await itemStore.fetchBids(id)
    if (item.value) {
      bidForm.amount = minBidAmount.value
      if (userStore.currentUser?.nickname || userStore.currentUser?.username) {
        bidForm.bidder = userStore.currentUser.nickname || userStore.currentUser.username
      }
    }
    if (userStore.isLoggedIn) {
      isFavorited.value = await userStore.checkFavorite(id)
    }
  }
})

function formatDate(date: string) {
  return dayjs(date).format('YYYY年MM月DD日')
}

function formatDateTime(date: string) {
  return dayjs(date).format('MM-DD HH:mm')
}

function handleBack() {
  router.back()
}

async function handleLike() {
  if (isLiked.value || !item.value) return
  try {
    await itemStore.likeItem(item.value.id)
    isLiked.value = true
  } catch (e) {
    console.error('点赞失败', e)
  }
}

async function handleToggleFavorite() {
  if (!item.value || !userStore.isLoggedIn) return
  isFavorited.value = await userStore.toggleFavorite(item.value.id)
}

async function handlePlaceBid() {
  if (!item.value) return
  if (!bidForm.bidder.trim()) {
    alert('请输入您的昵称')
    return
  }
  if (!bidForm.amount || bidForm.amount < minBidAmount.value) {
    alert(`出价必须大于等于 ¥${minBidAmount.value}`)
    return
  }

  bidding.value = true
  try {
    await itemStore.placeBid(item.value.id, {
      bidder: bidForm.bidder.trim(),
      bidderId: userStore.currentUser?.id,
      amount: bidForm.amount
    })
    bidForm.amount = (item.value?.currentPrice || 0) + 1
    alert('出价成功！')
  } catch (e: any) {
    const msg = e?.response?.data?.message || '出价失败，请重试'
    alert(msg)
  } finally {
    bidding.value = false
  }
}
</script>

<style scoped>
.item-detail {
  min-height: 60vh;
}

.back-btn {
  margin-bottom: 1.5rem;
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.detail-image {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-status {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: 0.875rem;
  font-weight: 500;
}

.draft-notice,
.scheduled-notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
}

.draft-notice {
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.scheduled-notice {
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.notice-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.notice-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.notice-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.detail-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  flex: 1;
}

.detail-price {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  color: var(--color-accent);
  flex-shrink: 0;
}

.price-symbol {
  font-size: 1.25rem;
  font-weight: 500;
}

.price-value {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding: 1.5rem;
  background: var(--color-background);
  border-radius: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-content {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text);
}

.story-content {
  padding: 1.5rem;
  background: var(--color-background);
  border-radius: 12px;
  border-left: 3px solid var(--color-primary);
}

.detail-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.like-count {
  opacity: 0.8;
}

.btn-favorited {
  background: rgba(244, 63, 94, 0.1);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-favorited:hover {
  background: rgba(244, 63, 94, 0.15);
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
  display: flex;
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

.price-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-radius: 12px;
  font-size: 0.875rem;
}

.price-info-item {
  color: var(--color-text-secondary);
}

.price-info-item.highlight {
  color: var(--color-accent);
  font-weight: 600;
}

.price-info-item.sold {
  color: #22c55e;
  font-weight: 600;
}

.bid-section {
  padding: 1.5rem;
  background: var(--color-background);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.bid-form {
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
  color: var(--color-text-secondary);
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.loading-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.bids-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  background: var(--color-background);
  border-radius: 8px;
}

.bids-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.bid-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--color-background);
  border-radius: 8px;
  transition: transform 0.2s;
}

.bid-item.top {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05));
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.bid-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.bid-rank.num {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border-radius: 6px;
}

.bid-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.bid-bidder {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
}

.bid-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.bid-amount {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

@media (max-width: 968px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .detail-header {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .detail-meta {
    grid-template-columns: 1fr;
  }

  .detail-actions {
    flex-direction: column;
  }

  .detail-actions .btn {
    width: 100%;
  }
}
</style>
