<template>
  <div class="item-form">
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">藏品图片 *</label>
        <ImageUploader v-model="form.imageUrl" :disabled="submitting" />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">藏品名称 *</label>
          <input
            type="text"
            class="form-input"
            v-model="form.title"
            placeholder="给你的旧物起个名字"
            :disabled="submitting"
          />
        </div>

        <div class="form-group">
          <label class="form-label">价格 (元) *</label>
          <input
            type="number"
            class="form-input"
            v-model.number="form.price"
            placeholder="0.00"
            min="0"
            step="0.01"
            :disabled="submitting"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">简短描述 *</label>
        <textarea
          class="form-textarea"
          v-model="form.description"
          placeholder="用一句话描述这件物品"
          :disabled="submitting"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">背后的故事 *</label>
        <textarea
          class="form-textarea"
          v-model="form.story"
          placeholder="讲述这件物品承载的回忆和故事..."
          rows="4"
          :disabled="submitting"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">情绪标签</label>
        <EmotionTagSelector v-model="form.emotionTags" :disabled="submitting" />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">物品分类</label>
          <select class="form-select" v-model="form.category" :disabled="submitting">
            <option value="">请选择分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">新旧程度</label>
          <select class="form-select" v-model="form.condition" :disabled="submitting">
            <option value="">请选择新旧程度</option>
            <option v-for="cond in conditions" :key="cond" :value="cond">{{ cond }}</option>
          </select>
        </div>
      </div>

      <div v-if="item" class="form-group">
        <label class="form-label">状态</label>
        <select class="form-select" v-model="form.status" :disabled="submitting">
          <option value="active">正在拍卖</option>
          <option value="sold">已成交</option>
          <option value="archived">已下架</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>

    <div class="form-actions">
      <button class="btn btn-secondary" @click="handleCancel" :disabled="submitting">
        取消
      </button>
      <button class="btn btn-primary" @click="handleSubmit" :disabled="!isValid || submitting">
        {{ submitting ? '提交中...' : (item ? '保存修改' : '上架藏品') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import ImageUploader from './ImageUploader.vue'
import EmotionTagSelector from './EmotionTagSelector.vue'
import { CATEGORIES, CONDITIONS } from '@/types'
import type { Item, ItemCreate, ItemUpdate } from '@/types'

const props = defineProps<{
  item?: Item | null
}>()

const emit = defineEmits<{
  submit: [data: ItemCreate | ItemUpdate]
  cancel: []
}>()

const itemStore = useItemStore()

const form = reactive<ItemCreate & { status?: Item['status'] }>({
  title: '',
  description: '',
  story: '',
  price: 0,
  imageUrl: '',
  emotionTags: '',
  category: '',
  condition: '',
  status: 'active'
})

const categories = ref<string[]>([...CATEGORIES])
const conditions = ref<string[]>([...CONDITIONS])
const submitting = ref(false)
const error = ref('')

const isValid = computed(() => {
  return form.title.trim() && form.description.trim() && form.story.trim() && form.price >= 0
})

watch(() => props.item, (newItem) => {
  if (newItem) {
    Object.assign(form, {
      title: newItem.title,
      description: newItem.description,
      story: newItem.story,
      price: newItem.price,
      imageUrl: newItem.imageUrl,
      emotionTags: newItem.emotionTags,
      category: newItem.category,
      condition: newItem.condition,
      status: newItem.status
    })
  }
}, { immediate: true })

onMounted(async () => {
  try {
    const meta = await itemStore.fetchMetaData()
    if (meta) {
      categories.value = meta.categories
      conditions.value = meta.conditions
    }
  } catch (e) {
    // use defaults
  }
})

function handleCancel() {
  emit('cancel')
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  error.value = ''
  submitting.value = true

  try {
    const data: ItemCreate | ItemUpdate = {
      title: form.title.trim(),
      description: form.description.trim(),
      story: form.story.trim(),
      price: Number(form.price),
      imageUrl: form.imageUrl,
      emotionTags: form.emotionTags,
      category: form.category,
      condition: form.condition
    }

    if (props.item) {
      ;(data as ItemUpdate).status = form.status
    }

    emit('submit', data)
  } catch (e) {
    error.value = '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.item-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-error {
  color: var(--color-accent);
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  background: rgba(244, 63, 94, 0.1);
  border-radius: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
