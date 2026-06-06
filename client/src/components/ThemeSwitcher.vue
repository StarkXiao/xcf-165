<template>
  <div class="theme-switcher">
    <button class="theme-btn" @click="showMenu = !showMenu" :title="themeStore.themeConfig.label">
      <span class="theme-icon">{{ themeIcon }}</span>
    </button>

    <transition name="fade">
      <div v-if="showMenu" class="theme-menu">
        <div class="theme-menu-title">选择主题</div>
        <div class="theme-options">
          <button
            v-for="theme in themes"
            :key="theme.name"
            class="theme-option"
            :class="{ active: themeStore.currentTheme === theme.name }"
            @click="selectTheme(theme.name)"
          >
            <span class="theme-preview" :style="{ background: theme.primary }"></span>
            <span class="theme-label">{{ theme.label }}</span>
          </button>
        </div>
      </div>
    </transition>

    <div v-if="showMenu" class="theme-backdrop" @click="showMenu = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useThemeStore } from '@/stores/themeStore'
import { THEMES } from '@/types'
import type { Theme } from '@/types'

const themeStore = useThemeStore()
const showMenu = ref(false)

const themes = Object.values(THEMES)

const themeIcon = computed(() => {
  const icons: Record<Theme, string> = {
    light: '☀️',
    dark: '🌙',
    warm: '🔥',
    cool: '❄️'
  }
  return icons[themeStore.currentTheme]
})

function selectTheme(theme: Theme) {
  themeStore.setTheme(theme)
  showMenu.value = false
}
</script>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: background 0.2s ease;
  color: var(--color-text);
}

.theme-btn:hover {
  background: var(--color-background);
}

.theme-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.theme-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 180px;
}

.theme-menu-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  width: 100%;
  text-align: left;
  transition: background 0.2s ease;
  color: var(--color-text);
}

.theme-option:hover {
  background: var(--color-background);
}

.theme-option.active {
  background: rgba(99, 102, 241, 0.1);
}

.theme-preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 3px var(--color-border);
}

.theme-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
