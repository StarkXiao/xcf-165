<template>
  <div class="home-view">
    <div class="container">
      <section class="hero">
        <h1 class="hero-title">
          <span class="hero-icon">💔</span>
          分手遗物拍卖行
        </h1>
        <p class="hero-subtitle">让每一件旧物都有新的归宿，让每一段回忆都能好好告别</p>
        <p class="hero-desc">在这里，你可以把曾经承载着爱情的旧物，以故事的形式分享给他人。
          或许是一件礼物、一张车票、一本书...让它们带着你的回忆，
          去遇见下一个懂它的人。
        </p>
        <div class="hero-actions">
          <router-link to="/manage" class="btn btn-primary">
            <span>📦</span>
            上架我的藏品
          </router-link>
        </div>
      </section>

      <FilterBar @filter="handleFilter" />

      <section class="items-section">
        <div class="section-header">
          <h2 class="section-title">拍品展墙</h2>
          <span class="section-count">共 {{ itemStore.pagination.total }} 件藏品</span>
        </div>

        <div v-if="itemStore.loading && itemStore.items.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="itemStore.items.length === 0" class="empty">
          <div class="empty-icon">📭</div>
          <p>暂无藏品</p>
          <p class="empty-hint">成为第一个分享故事的人吧</p>
        </div>

        <div v-else class="grid">
          <ItemCard
            v-for="item in itemStore.items"
            :key="item.id"
            :item="item"
            @click="handleItemClick"
          />
        </div>

        <div v-if="itemStore.hasMore && !itemStore.loading" class="load-more">
          <button class="btn btn-secondary" @click="handleLoadMore">
            加载更多
          </button>
        </div>

        <div v-if="itemStore.loading && itemStore.items.length > 0" class="loading">
          <div class="loading-spinner"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import ItemCard from '@/components/ItemCard.vue'
import FilterBar from '@/components/FilterBar.vue'
import type { Item } from '@/types'

const itemStore = useItemStore()

onMounted(() => {
  itemStore.fetchItems()
})

function handleFilter(params: Record<string, unknown>) {
  itemStore.setQueryParams(params)
  itemStore.fetchItems()
}

function handleLoadMore() {
  itemStore.fetchMoreItems()
}

function handleItemClick(item: Item) {
  console.log('Clicked:', item.title)
}
</script>

<style scoped>
.hero {
  text-align: center;
  padding: 3rem 1rem 4rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.hero-icon {
  font-size: 2.5rem;
  -webkit-text-fill-color: initial;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  font-weight: 500;
}

.hero-desc {
  font-size: 1rem;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.section-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

@media (max-width: 768px) {
  .hero {
    padding: 2rem 1rem 3rem;
  }

  .hero-title {
    font-size: 1.75rem;
    flex-direction: column;
    gap: 0.25rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }
}
</style>
