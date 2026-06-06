<template>
  <div class="calendar-view">
    <div class="container">
      <section class="calendar-header">
        <h1 class="calendar-title">
          <span class="title-icon">📅</span>
          情绪日历
        </h1>
        <p class="calendar-subtitle">按上架日期回顾藏品故事，感受每一份情感的温度</p>
      </section>

      <section class="calendar-controls card">
        <div class="controls-row">
          <div class="month-navigator">
            <button class="nav-btn" @click="prevMonth" title="上个月">
              ←
            </button>
            <div class="month-display">
              <span class="year">{{ currentYear }}年</span>
              <span class="month">{{ currentMonth }}月</span>
            </div>
            <button class="nav-btn" @click="nextMonth" title="下个月">
              →
            </button>
            <button class="btn btn-ghost btn-today" @click="goToToday">
              今天
            </button>
          </div>

          <div class="filter-group">
            <label class="filter-label">情绪筛选</label>
            <div class="tag-filters">
              <button
                class="tag-filter"
                :class="{ active: selectedEmotionTag === '' }"
                @click="selectEmotionTag('')"
              >
                全部
              </button>
              <button
                v-for="tag in emotionTags"
                :key="tag"
                class="tag-filter"
                :class="{ active: selectedEmotionTag === tag }"
                @click="selectEmotionTag(tag)"
              >
                {{ tag }}
                <span v-if="itemStore.calendarData?.emotionTagCounts?.[tag]" class="tag-count">
                  {{ itemStore.calendarData.emotionTagCounts[tag] }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-value">{{ itemStore.calendarData?.totalItems || 0 }}</span>
            <span class="stat-label">本月藏品</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ daysWithItems }}</span>
            <span class="stat-label">活跃天数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ mostFrequentTag }}</span>
            <span class="stat-label">主流情绪</span>
          </div>
        </div>
      </section>

      <div v-if="itemStore.calendarLoading" class="loading">
        <div class="loading-spinner"></div>
      </div>

      <section v-else class="calendar-section card">
        <div class="calendar-weekdays">
          <div v-for="day in weekDays" :key="day" class="weekday">
            {{ day }}
          </div>
        </div>

        <div class="calendar-grid">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'has-items': (day.data?.count ?? 0) > 0,
              'selected': selectedDate === day.dateStr
            }"
            @click="selectDate(day)"
          >
            <div class="day-number">{{ day.day }}</div>
            <div v-if="day.data && day.data.count > 0" class="day-items-preview">
              <div class="items-count">{{ day.data.count }}件</div>
              <div class="items-tags">
                <span
                  v-for="tag in getPreviewTags(day.data.items)"
                  :key="tag"
                  class="mini-tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="selectedDateData && selectedDateData.items.length > 0" class="day-items-section card">
        <div class="section-header">
          <h2 class="section-title">
            <span class="date-icon">📖</span>
            {{ formatSelectedDate }} 的故事
          </h2>
          <span class="section-count">共 {{ selectedDateData.items.length }} 件藏品</span>
        </div>

        <div class="items-grid">
          <div
            v-for="item in selectedDateData.items"
            :key="item.id"
            class="day-item-card"
            @click="goToItemDetail(item.id)"
          >
            <div class="item-thumb">
              <img :src="item.imageUrl || placeholderImage" :alt="item.title" loading="lazy" />
            </div>
            <div class="item-info">
              <h3 class="item-title">{{ item.title }}</h3>
              <p class="item-story-preview">{{ item.story }}</p>
              <div class="item-tags">
                <span
                  v-for="tag in getItemTags(item.emotionTags)"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
              <div class="item-footer">
                <span class="item-price">¥{{ item.currentPrice || item.price }}</span>
                <span class="item-views">👁️ {{ item.views }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="selectedDate" class="day-items-section card empty-day">
        <div class="empty-icon">🌸</div>
        <p>{{ formatSelectedDate }} 没有上架的藏品</p>
        <p class="empty-hint">换一天看看，或许有新的发现</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useItemStore } from '@/stores/itemStore'
import { EMOTION_TAGS } from '@/types'
import type { Item, CalendarDayItem } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const itemStore = useItemStore()

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)
const selectedEmotionTag = ref('')
const selectedDate = ref<string>('')
const emotionTags = ref<string[]>([...EMOTION_TAGS])
const placeholderImage = 'https://picsum.photos/seed/empty/600/400'

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarDayDisplay {
  day: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  data: CalendarDayItem | undefined
}

const calendarDays = computed<CalendarDayDisplay[]>(() => {
  const days: CalendarDayDisplay[] = []
  const startOfMonth = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`)
  const startDayOfWeek = startOfMonth.day()
  const daysInMonth = startOfMonth.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const prevMonth = startOfMonth.subtract(1, 'month')
  const daysInPrevMonth = prevMonth.daysInMonth()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const dateStr = prevMonth.date(dayNum).format('YYYY-MM-DD')
    days.push({
      day: dayNum,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === today,
      data: undefined
    })
  }

  const daysMap = new Map<string, CalendarDayItem>()
  if (itemStore.calendarData?.days) {
    itemStore.calendarData.days.forEach((d) => {
      daysMap.set(d.date, d)
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today,
      data: daysMap.get(dateStr)
    })
  }

  const remaining = 42 - days.length
  const nextMonth = startOfMonth.add(1, 'month')
  for (let d = 1; d <= remaining; d++) {
    const dateStr = nextMonth.date(d).format('YYYY-MM-DD')
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === today,
      data: undefined
    })
  }

  return days
})

const daysWithItems = computed(() => {
  if (!itemStore.calendarData?.days) return 0
  return itemStore.calendarData.days.filter((d) => d.count > 0).length
})

const mostFrequentTag = computed(() => {
  if (!itemStore.calendarData?.emotionTagCounts) return '-'
  const entries = Object.entries(itemStore.calendarData.emotionTagCounts)
  if (entries.length === 0) return '-'
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][1] > 0 ? entries[0][0] : '-'
})

const selectedDateData = computed<CalendarDayItem | undefined>(() => {
  if (!selectedDate.value || !itemStore.calendarData?.days) return undefined
  return itemStore.calendarData.days.find((d) => d.date === selectedDate.value)
})

const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return dayjs(selectedDate.value).format('YYYY年M月D日')
})

onMounted(async () => {
  try {
    const meta = await itemStore.fetchMetaData()
    if (meta?.emotionTags?.length) {
      emotionTags.value = meta.emotionTags
    }
  } catch (e) {
    // use default
  }
  await loadCalendar()
})

watch([currentYear, currentMonth, selectedEmotionTag], () => {
  loadCalendar()
})

async function loadCalendar() {
  await itemStore.fetchCalendar({
    year: currentYear.value,
    month: currentMonth.value,
    emotionTag: selectedEmotionTag.value || undefined
  })
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  selectedDate.value = ''
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  selectedDate.value = ''
}

function goToToday() {
  const now = dayjs()
  currentYear.value = now.year()
  currentMonth.value = now.month() + 1
  selectedDate.value = now.format('YYYY-MM-DD')
}

function selectEmotionTag(tag: string) {
  selectedEmotionTag.value = tag
  selectedDate.value = ''
}

function selectDate(day: CalendarDayDisplay) {
  if (!day.isCurrentMonth) {
    const date = dayjs(day.dateStr)
    currentYear.value = date.year()
    currentMonth.value = date.month() + 1
  }
  selectedDate.value = day.dateStr
}

function getPreviewTags(items: Item[]): string[] {
  const tagSet = new Set<string>()
  items.forEach((item) => {
    const tags = item.emotionTags ? item.emotionTags.split(',').filter(Boolean) : []
    tags.forEach((t) => tagSet.add(t))
  })
  return Array.from(tagSet).slice(0, 3)
}

function getItemTags(emotionTagsStr: string): string[] {
  return emotionTagsStr ? emotionTagsStr.split(',').filter(Boolean) : []
}

function goToItemDetail(id: string) {
  router.push(`/item/${id}`)
}
</script>

<style scoped>
.calendar-view {
  padding: 2rem 0;
}

.calendar-header {
  text-align: center;
  padding: 2rem 1rem 3rem;
}

.calendar-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.title-icon {
  font-size: 2rem;
  -webkit-text-fill-color: initial;
}

.calendar-subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.calendar-controls {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.month-navigator {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 1.125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.05);
}

.month-display {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.month-display .year {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.month-display .month {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.btn-today {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 300px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.tag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-filter {
  padding: 0.4rem 0.875rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tag-filter:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-filter.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: transparent;
}

.tag-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.stat-item {
  text-align: center;
  padding: 1rem;
  border-radius: 10px;
  background: var(--color-background);
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.calendar-section {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.weekday {
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0.5rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.calendar-day {
  min-height: 100px;
  padding: 0.5rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.calendar-day:hover:not(.other-month) {
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

.calendar-day.other-month {
  opacity: 0.35;
  cursor: default;
  background: var(--color-background);
}

.calendar-day.other-month:hover {
  opacity: 0.5;
  cursor: pointer;
}

.calendar-day.today {
  border-color: var(--color-accent);
  border-width: 2px;
}

.calendar-day.has-items {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
}

.calendar-day.selected {
  border-color: var(--color-primary);
  border-width: 2px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.day-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.today .day-number {
  color: var(--color-accent);
}

.day-items-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: flex-end;
}

.items-count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
}

.items-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem;
}

.mini-tag {
  font-size: 0.625rem;
  padding: 0.1rem 0.375rem;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--color-primary);
  font-weight: 500;
}

.day-items-section {
  padding: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-icon {
  font-size: 1.25rem;
}

.section-count {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.day-item-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-item-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
}

.item-thumb {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-story-preview {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.item-tags .tag {
  font-size: 0.6875rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  font-weight: 500;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.item-price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.item-views {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.empty-day {
  text-align: center;
  padding: 3rem 1.5rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-day p {
  color: var(--color-text);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.empty-hint {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
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

@media (max-width: 768px) {
  .calendar-header {
    padding: 1.5rem 1rem 2rem;
  }

  .calendar-title {
    font-size: 1.5rem;
  }

  .controls-row {
    flex-direction: column;
  }

  .filter-group {
    min-width: 0;
    width: 100%;
  }

  .stats-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .calendar-day {
    min-height: 70px;
    padding: 0.375rem;
  }

  .day-items-preview {
    display: none;
  }

  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
