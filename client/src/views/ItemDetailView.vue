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
              <span class="price-value">{{ item.price }}</span>
            </div>
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

          <div class="detail-actions">
            <button class="btn btn-primary" @click="handleLike" :disabled="isLiked">
              <span>{{ isLiked ? '❤️' : '🤍' }}</span>
              {{ isLiked ? '已点赞' : '点赞' }}
              <span class="like-count">({{ item.likes }})</span>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useItemStore } from '@/stores/itemStore'
import type { Item } from '@/types'

const route = useRoute()
const router = useRouter()
const itemStore = useItemStore()

const isLiked = ref(false)
const placeholderImage = 'https://picsum.photos/seed/empty/800/600'

const item = computed<Item | null>(() => itemStore.currentItem)

const emotionTagsList = computed(() => {
  return item.value?.emotionTags ? item.value.emotionTags.split(',').filter(Boolean) : []
})

const statusText = computed(() => {
  if (!item.value) return ''
  const map: Record<string, string> = {
    sold: '已成交',
    archived: '已下架'
  }
  return map[item.value.status] || ''
})

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    await itemStore.fetchItemById(id)
  }
})

function formatDate(date: string) {
  return dayjs(date).format('YYYY年MM月DD日')
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
