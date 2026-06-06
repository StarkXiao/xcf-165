import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Theme, ThemeConfig } from '@/types'
import { THEMES } from '@/types'

export const useThemeStore = defineStore('theme', () => {
  const storedTheme = localStorage.getItem('theme') as Theme | null
  const currentTheme = ref<Theme>(storedTheme || 'light')
  const themeConfig = ref<ThemeConfig>(THEMES[currentTheme.value])

  watch(currentTheme, (newTheme) => {
    themeConfig.value = THEMES[newTheme]
    localStorage.setItem('theme', newTheme)
    applyTheme(themeConfig.value)
  }, { immediate: true })

  function applyTheme(theme: ThemeConfig) {
    const root = document.documentElement
    root.style.setProperty('--color-primary', theme.primary)
    root.style.setProperty('--color-secondary', theme.secondary)
    root.style.setProperty('--color-background', theme.background)
    root.style.setProperty('--color-surface', theme.surface)
    root.style.setProperty('--color-text', theme.text)
    root.style.setProperty('--color-text-secondary', theme.textSecondary)
    root.style.setProperty('--color-border', theme.border)
    root.style.setProperty('--color-accent', theme.accent)
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
  }

  function toggleTheme() {
    const themes: Theme[] = ['light', 'dark', 'warm', 'cool']
    const currentIndex = themes.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    currentTheme.value = themes[nextIndex]
  }

  return {
    currentTheme,
    themeConfig,
    setTheme,
    toggleTheme
  }
})
