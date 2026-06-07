<template>
  <div class="item-card card" @click="handleClick">
    <div class="item-image">
      <img :src="item.imageUrl || placeholderImage" :alt="item.title" loading="lazy" />
      <div class="item-status" v-if="item.status !== 'active'">
        {{ statusText }}
      </div>
      <div class="card-actions">
        <button class="like-btn" :class="{ liked: isLiked }" @click.stop="handleLike">
          <span>❤️</span>
          <span class="like-count">{{ item.likes }}</span>
        </button>
        <button
          v-if="userStore.isLoggedIn"
          class="favorite-btn"
          :class="{ favorited: isFavorited }"
          @click.stop="handleToggleFavorite"
        >
          <span>{{ isFavorited ? '💖' : '🤍' }}</span>
        </button>
      </div>
    </div>

    <div class="item-content">
      <h3 class="item-title">{{ item.title }}</h3>
      <p class="item-desc">{{ item.description }}</p>

      <div class="item-tags" v-if="emotionTagsList.length > 0">
        <span class="tag" v-for="tag in emotionTagsList" :key="tag">{{ tag }}</span>
      </div>

      <div class="item-footer">
        <div class="item-price">
          <span class="price-symbol">¥</span>
          <span class="price-value">{{ displayPrice }}</span>
          <span class="price-label" v-if="item.status === 'active' && item.bidCount > 0">当前</span>
          <span class="price-label" v-else-if="item.status === 'sold'">成交</span>
          <span class="price-label" v-else>起拍</span>
        </div>
        <div class="item-meta">
          <span class="meta-item">🏷️ {{ item.bidCount || 0 }}</span>
          <span class="meta-item">👁️ {{ item.views }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useItemStore } from '@/stores/itemStore'
import { useUserStore } from '@/stores/userStore'
import type { Item } from '@/types'

const props = defineProps<{
  item: Item
}>()

const emit = defineEmits<{
  click: [item: Item]
  favoriteToggled: [itemId: string, favorited: boolean]
}>()

const router = useRouter()
const itemStore = useItemStore()
const userStore = useUserStore()
const isLiked = ref(false)
const placeholderImage = 'https://picsum.photos/seed/empty/600/400'

const emotionTagsList = computed(() => {
  return props.item.emotionTags ? props.item.emotionTags.split(',').filter(Boolean) : []
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    sold: '已成交',
    archived: '已下架',
    draft: '草稿',
    scheduled: '即将上架'
  }
  return map[props.item.status] || ''
})

const displayPrice = computed(() => {
  if (props.item.status === 'sold' && props.item.soldPrice) {
    return props.item.soldPrice
  }
  return props.item.currentPrice || props.item.price
})

const isFavorited = computed(() => {
  return userStore.isLoggedIn && userStore.favoriteItems.has(props.item.id)
})

function handleClick() {
  emit('click', props.item)
  router.push(`/item/${props.item.id}`)
}

async function handleLike() {
  if (isLiked.value) return
  try {
    await itemStore.likeItem(props.item.id)
    isLiked.value = true
  } catch (e) {
    console.error('点赞失败', e)
  }
}

async function handleToggleFavorite() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  const favorited = await userStore.toggleFavorite(props.item.id)
  emit('favoriteToggled', props.item.id, favorited)
}
</script>

<style scoped>
.item-card {
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.item-image {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.item-card:hover .item-image img {
  transform: scale(1.05);
}

.item-status {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-text);
  color: var(--color-surface);
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  color: var(--color-text);
  border: none;
  cursor: pointer;
}

.like-btn:hover {
  background: white;
  transform: scale(1.05);
}

.like-btn.liked {
  background: var(--color-accent);
  color: white;
}

.like-count {
  font-variant-numeric: tabular-nums;
}

.favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  align-self: flex-end;
}

.favorite-btn:hover {
  background: white;
  transform: scale(1.1);
}

.favorite-btn.favorited {
  background: rgba(244, 63, 94, 0.15);
  color: var(--color-accent);
}

.item-content {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-desc {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  flex: 1;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.item-price {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  color: var(--color-accent);
}

.price-symbol {
  font-size: 0.875rem;
  font-weight: 500;
}

.price-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.price-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.item-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
