<template>
  <header class="header">
    <div class="container header-inner">
      <router-link to="/" class="logo">
        <span class="logo-icon">💔</span>
        <span class="logo-text">分手遗物拍卖行</span>
      </router-link>

      <nav class="nav">
        <router-link to="/" class="nav-link" :class="{ active: route.path === '/' }">
          拍品展墙
        </router-link>
        <router-link to="/orders" class="nav-link" :class="{ active: route.path === '/orders' }">
          我的订单
        </router-link>
        <router-link to="/manage" class="nav-link" :class="{ active: route.path === '/manage' }">
          藏品管理
        </router-link>
      </nav>

      <div class="header-actions">
        <ThemeSwitcher />

        <template v-if="userStore.isLoggedIn">
          <router-link to="/profile" class="user-menu" :title="displayName">
            <span v-if="!userStore.currentUser?.avatar" class="user-avatar placeholder">👤</span>
            <img v-else :src="userStore.currentUser.avatar" :alt="displayName" class="user-avatar" />
            <span class="user-name">{{ displayName }}</span>
          </router-link>
          <button class="btn-logout" @click="handleLogout" title="退出登录">
            🚪
          </button>
        </template>
        <router-link v-else to="/login" class="btn btn-primary btn-login">
          登录 / 注册
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const displayName = computed(() => {
  return userStore.currentUser?.nickname || userStore.currentUser?.username || '用户'
})

async function handleLogout() {
  await userStore.logout()
  router.push('/')
}

onMounted(async () => {
  if (!userStore.currentUser) {
    await userStore.fetchCurrentUser()
  }
})
</script>

<style scoped>
.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: var(--color-text-secondary);
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--color-text);
}

.nav-link.active {
  color: var(--color-primary);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--color-text);
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.user-menu:hover {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.user-avatar.placeholder {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-logout {
  background: none;
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);
}

.btn-logout:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(239, 68, 68, 0.05);
}

.btn-login {
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-login:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

@media (max-width: 768px) {
  .nav {
    display: none;
  }

  .logo-text {
    display: none;
  }

  .user-name {
    display: none;
  }

  .btn-login {
    padding: 0.4rem 0.85rem;
    font-size: 0.8rem;
  }
}
</style>
