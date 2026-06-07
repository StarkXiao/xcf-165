<template>
  <div class="favorites-view">
    <div class="container">
      <div class="favorites-header">
        <div>
          <h1 class="page-title">
            <span class="title-icon">💖</span>
            我的收藏夹
          </h1>
          <p class="page-subtitle">
            收藏你心动的旧物，共 {{ userStore.myFavoritesPagination.total }} 件藏品
          </p>
        </div>
      </div>

      <div v-if="userStore.myFavoritesLoading && userStore.myFavorites.length === 0" class="loading">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="userStore.myFavorites.length === 0" class="empty">
        <div class="empty-icon">💔</div>
        <p>还没有收藏任何藏品</p>
        <p class="empty-hint">去展墙逛逛，收藏你心动的旧物吧</p>
        <router-link to="/" class="btn btn-primary">
          <span>🏠</span>
          去逛逛
        </router-link>
      </div>

      <div v-else>
        <div class="grid">
          <ItemCard
            v-for="item in userStore.myFavorites"
            :key="item.id"
            :item="item"
            @click="handleItemClick"
            @favorite-toggled="handleFavoriteToggled"
          />
        </div>

        <div v-if="userStore.myFavoritesPagination.page < userStore.myFavoritesPagination.totalPages && !userStore.myFavoritesLoading" class="load-more">
          <button class="btn btn-secondary" @click="handleLoadMore">
            加载更多
          </button>
        </div>

        <div v-if="userStore.myFavoritesLoading && userStore.myFavorites.length > 0" class="loading">
          <div class="loading-spinner small"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import ItemCard from '@/components/ItemCard.vue'
import type { Item } from '@/types'

const userStore = useUserStore()

onMounted(() => {
  userStore.fetchMyFavorites()
})

function handleItemClick(item: Item) {
  console.log('Clicked:', item.title)
}

function handleFavoriteToggled(itemId: string, favorited: boolean) {
  if (!favorited) {
    userStore.myFavorites = userStore.myFavorites.filter(i => i.id !== itemId)
  }
}

function handleLoadMore() {
  const nextPage = userStore.myFavoritesPagination.page + 1
  userStore.fetchMyFavorites({ page: nextPage })
}
</script>

<style scoped>
.favorites-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 1.75rem;
}

.page-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
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

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
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

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.875rem;
  }
}
</style>
