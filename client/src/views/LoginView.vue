<template>
  <div class="auth-view">
    <div class="container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">💔</div>
          <h1 class="auth-title">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h1>
          <p class="auth-subtitle">
            {{ mode === 'login' ? '登录后可管理藏品和收藏记录' : '加入分手遗物拍卖行，分享你的故事' }}
          </p>
        </div>

        <div class="tabs">
          <button
            class="tab"
            :class="{ active: mode === 'login' }"
            @click="mode = 'login'; error = ''"
          >
            登录
          </button>
          <button
            class="tab"
            :class="{ active: mode === 'register' }"
            @click="mode = 'register'; error = ''"
          >
            注册
          </button>
        </div>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div v-if="mode === 'register'" class="form-group">
            <label class="form-label">昵称（可选）</label>
            <input
              v-model="form.nickname"
              type="text"
              class="form-input"
              placeholder="给自己起个昵称"
            />
          </div>

          <div class="form-group">
            <label class="form-label">用户名</label>
            <input
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="请输入用户名（至少3个字符）"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">密码</label>
            <input
              v-model="form.password"
              type="password"
              class="form-input"
              placeholder="请输入密码（至少6个字符）"
              required
            />
          </div>

          <div v-if="mode === 'register'" class="form-group">
            <label class="form-label">确认密码</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              class="form-input"
              placeholder="请再次输入密码"
              required
            />
          </div>

          <div v-if="error" class="form-error">{{ error }}</div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="userStore.loading"
          >
            <span v-if="userStore.loading" class="loading-spinner-small"></span>
            {{ mode === 'login' ? '登录' : '注册' }}
          </button>
        </form>

        <div class="auth-footer">
          <span>{{ mode === 'login' ? '还没有账号？' : '已有账号？' }}</span>
          <button
            class="link-btn"
            @click="mode = mode === 'login' ? 'register' : 'login'; error = ''"
          >
            {{ mode === 'login' ? '立即注册' : '去登录' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

type Mode = 'login' | 'register'
const mode = ref<Mode>('login')
const error = ref('')

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})

async function handleSubmit() {
  error.value = ''

  if (mode.value === 'register') {
    if (form.password !== form.confirmPassword) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (form.username.length < 3) {
      error.value = '用户名至少3个字符'
      return
    }
    if (form.password.length < 6) {
      error.value = '密码至少6个字符'
      return
    }

    const result = await userStore.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname || undefined
    })

    if (result.success) {
      mode.value = 'login'
      error.value = ''
    } else {
      error.value = result.message || '注册失败'
    }
  } else {
    const result = await userStore.login({
      username: form.username,
      password: form.password
    })

    if (result.success) {
      router.push('/')
    } else {
      error.value = result.message || '登录失败'
    }
  }
}
</script>

<style scoped>
.auth-view {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.auth-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--color-border);
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-logo {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  background: var(--color-background);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 1.5rem;
}

.tab {
  flex: 1;
  padding: 0.65rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.95rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.95rem;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.btn-block {
  width: 100%;
  padding: 0.85rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
}

.link-btn:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 1.75rem;
  }
}
</style>
