<template>
  <div class="profile-view">
    <div class="container">
      <section class="profile-header card">
        <div class="profile-avatar">
          <span v-if="!userStore.currentUser?.avatar" class="avatar-placeholder">👤</span>
          <img v-else :src="userStore.currentUser.avatar" :alt="displayName" />
        </div>
        <div class="profile-info">
          <h1 class="profile-name">{{ displayName }}</h1>
          <p class="profile-username">@{{ userStore.currentUser?.username }}</p>
          <p v-if="userStore.currentUser?.bio" class="profile-bio">
            {{ userStore.currentUser.bio }}
          </p>
          <p class="profile-joined">
            加入于 {{ formatDate(userStore.currentUser?.createdAt) }}
          </p>
        </div>
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ userStore.myItemsPagination.total }}</span>
            <span class="stat-label">我的藏品</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStore.myFavoritesPagination.total }}</span>
            <span class="stat-label">收藏</span>
          </div>
        </div>
      </section>

      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'items' }"
          @click="activeTab = 'items'"
        >
          📦 我的藏品
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'favorites' }"
          @click="activeTab = 'favorites'"
        >
          ❤️ 收藏记录
        </button>
      </div>

      <section v-if="activeTab === 'items'" class="content-section">
        <div v-if="userStore.myItemsLoading && userStore.myItems.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="userStore.myItems.length === 0" class="empty">
          <div class="empty-icon">📦</div>
          <p>还没有上架藏品</p>
          <router-link to="/manage" class="btn btn-primary">上架我的第一件藏品</router-link>
        </div>

        <div v-else class="grid">
          <ItemCard
            v-for="item in userStore.myItems"
            :key="item.id"
            :item="item"
          />
        </div>
      </section>

      <section v-else class="content-section">
        <div v-if="userStore.myFavoritesLoading && userStore.myFavorites.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="userStore.myFavorites.length === 0" class="empty">
          <div class="empty-icon">❤️</div>
          <p>还没有收藏任何藏品</p>
          <router-link to="/" class="btn btn-secondary">去逛逛</router-link>
        </div>

        <div v-else class="grid">
          <ItemCard
            v-for="item in userStore.myFavorites"
            :key="item.id"
            :item="item"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/userStore'
import ItemCard from '@/components/ItemCard.vue'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref<'items' | 'favorites'>('items')

const displayName = computed(() => {
  return userStore.currentUser?.nickname || userStore.currentUser?.username || '用户'
})

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY年MM月')
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  if (!userStore.currentUser) {
    await userStore.fetchCurrentUser()
  }
  await Promise.all([
    userStore.fetchMyItems(),
    userStore.fetchMyFavorites()
  ])
})
</script>

<style scoped>
.profile-view {
  padding: 2rem 0;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2.5rem;
}

.profile-info {
  flex: 1;
  min-width: 200px;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--color-text);
}

.profile-username {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.profile-bio {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.profile-joined {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.profile-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.tabs {
  display: flex;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
}

.tab {
  flex: 1;
  padding: 0.85rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.95rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.25);
}

.content-section {
  min-height: 300px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
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
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 3.5rem;
  opacity: 0.6;
}

.empty p {
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.card {
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }

  .profile-stats {
    width: 100%;
    justify-content: center;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
}
</style>
