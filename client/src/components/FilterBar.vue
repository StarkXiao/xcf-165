<template>
  <div class="filter-bar">
    <div class="filter-section">
      <div class="filter-search">
        <input
          type="text"
          class="form-input"
          placeholder="搜索藏品名称、描述..."
          :value="keyword"
          @input="handleKeywordChange"
        />
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">分类</label>
          <select class="form-select" :value="category" @change="handleCategoryChange">
            <option value="">全部分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">情绪标签</label>
          <select class="form-select" :value="emotionTag" @change="handleEmotionChange">
            <option value="">全部情绪</option>
            <option v-for="tag in emotionTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">排序</label>
          <select class="form-select" :value="sortBy" @change="handleSortChange">
            <option value="createdAt">最新发布</option>
            <option value="price">价格</option>
            <option value="views">浏览量</option>
            <option value="likes">点赞数</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">顺序</label>
          <select class="form-select" :value="sortOrder" @change="handleOrderChange">
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">价格区间</label>
          <div class="price-range">
            <input
              type="number"
              class="form-input"
              placeholder="最低价"
              :value="minPrice"
              @input="handleMinPriceChange"
              min="0"
            />
            <span class="price-separator">-</span>
            <input
              type="number"
              class="form-input"
              placeholder="最高价"
              :value="maxPrice"
              @input="handleMaxPriceChange"
              min="0"
            />
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn btn-ghost" @click="handleReset">
            重置筛选
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import { CATEGORIES, EMOTION_TAGS } from '@/types'

const emit = defineEmits<{
  filter: [params: Record<string, unknown>]
}>()

const itemStore = useItemStore()

const keyword = ref('')
const category = ref('')
const emotionTag = ref('')
const sortBy = ref<'createdAt' | 'price' | 'views' | 'likes'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const minPrice = ref<string>('')
const maxPrice = ref<string>('')

const categories = ref<string[]>([...CATEGORIES])
const emotionTags = ref<string[]>([...EMOTION_TAGS])

onMounted(async () => {
  try {
    const meta = await itemStore.fetchMetaData()
    if (meta) {
      categories.value = meta.categories
      emotionTags.value = meta.emotionTags
    }
  } catch (e) {
    // use defaults
  }
})

function emitFilter() {
  const params: Record<string, unknown> = {
    keyword: keyword.value || undefined,
    category: category.value || undefined,
    emotionTag: emotionTag.value || undefined,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    minPrice: minPrice.value ? Number(minPrice.value) : undefined,
    maxPrice: maxPrice.value ? Number(maxPrice.value) : undefined
  }
  emit('filter', params)
}

function handleKeywordChange(e: Event) {
  keyword.value = (e.target as HTMLInputElement).value
  emitFilter()
}

function handleCategoryChange(e: Event) {
  category.value = (e.target as HTMLSelectElement).value
  emitFilter()
}

function handleEmotionChange(e: Event) {
  emotionTag.value = (e.target as HTMLSelectElement).value
  emitFilter()
}

function handleSortChange(e: Event) {
  sortBy.value = (e.target as HTMLSelectElement).value as typeof sortBy.value
  emitFilter()
}

function handleOrderChange(e: Event) {
  sortOrder.value = (e.target as HTMLSelectElement).value as typeof sortOrder.value
  emitFilter()
}

function handleMinPriceChange(e: Event) {
  minPrice.value = (e.target as HTMLInputElement).value
  emitFilter()
}

function handleMaxPriceChange(e: Event) {
  maxPrice.value = (e.target as HTMLInputElement).value
  emitFilter()
}

function handleReset() {
  keyword.value = ''
  category.value = ''
  emotionTag.value = ''
  sortBy.value = 'createdAt'
  sortOrder.value = 'desc'
  minPrice.value = ''
  maxPrice.value = ''
  emitFilter()
}
</script>

<style scoped>
.filter-bar {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--color-border);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-search {
  width: 100%;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.price-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-range .form-input {
  flex: 1;
}

.price-separator {
  color: var(--color-text-secondary);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .filter-row {
    grid-template-columns: 1fr;
  }
}
</style>
