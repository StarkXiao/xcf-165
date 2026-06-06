<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">💔</span>
        <span class="footer-title">分手遗物拍卖行</span>
        <p class="footer-tagline">让每一件旧物都有新的归宿</p>
      </div>

      <div class="footer-stats" v-if="stats">
        <div class="stat-item">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">藏品总数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.active }}</span>
          <span class="stat-label">正在拍卖</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.totalViews }}</span>
          <span class="stat-label">总浏览量</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.totalLikes }}</span>
          <span class="stat-label">总点赞数</span>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="copyright">© {{ year }} 分手遗物拍卖行. 带着回忆，继续前行。</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import type { Stats } from '@/types'

const itemStore = useItemStore()
const stats = ref<Stats | null>(null)
const year = new Date().getFullYear()

onMounted(async () => {
  try {
    stats.value = await itemStore.fetchStats()
  } catch (e) {
    // ignore
  }
})
</script>

<style scoped>
.footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 2rem 0 1rem;
  margin-top: 4rem;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.footer-brand {
  text-align: center;
}

.footer-logo {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.footer-title {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-tagline {
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.footer-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 1.5rem;
  background: var(--color-background);
  border-radius: 12px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.footer-bottom {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.copyright {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .footer-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
