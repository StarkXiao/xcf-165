<template>
  <div class="item-form">
    <div v-if="hasLocalDraft && !item" class="draft-notice">
      <span>📝 检测到本地暂存的草稿</span>
      <button class="btn btn-ghost btn-sm" @click="restoreLocalDraft">恢复草稿</button>
      <button class="btn btn-ghost btn-sm" @click="discardLocalDraft">丢弃</button>
    </div>

    <div class="form-section">
      <div class="form-group">
        <label class="form-label">藏品图片</label>
        <ImageUploader v-model="form.imageUrl" :disabled="submitting" />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">藏品名称 <span class="required">*</span></label>
          <input
            type="text"
            class="form-input"
            v-model="form.title"
            placeholder="给你的旧物起个名字"
            :disabled="submitting"
          />
        </div>

        <div class="form-group">
          <label class="form-label">价格 (元) <span class="required">*</span></label>
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
        <label class="form-label">简短描述 <span class="required">*</span></label>
        <textarea
          class="form-textarea"
          v-model="form.description"
          placeholder="用一句话描述这件物品"
          :disabled="submitting"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">背后的故事 <span class="required">*</span></label>
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

      <div v-if="!item || item.status === 'draft' || item.status === 'scheduled'" class="form-group">
        <label class="form-label">
          定时上架时间
          <span class="form-hint">（选填，留空则立即上架或存为草稿）</span>
        </label>
        <input
          type="datetime-local"
          class="form-input"
          v-model="form.scheduledAt"
          :min="minDateTime"
          :disabled="submitting"
        />
      </div>

      <div v-if="item" class="form-group">
        <label class="form-label">状态</label>
        <select class="form-select" v-model="form.status" :disabled="submitting">
          <option value="draft">草稿</option>
          <option value="scheduled">定时上架</option>
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
      <button
        class="btn btn-outline"
        @click="handleSaveDraft"
        :disabled="submitting"
      >
        {{ submittingDraft ? '保存中...' : '保存草稿' }}
      </button>
      <button
        class="btn btn-primary"
        @click="handleSubmit"
        :disabled="!isValid || submitting"
      >
        {{ submitting ? '提交中...' : (item ? '保存修改' : (form.scheduledAt ? '定时上架' : '立即上架')) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, onBeforeUnmount } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import ImageUploader from './ImageUploader.vue'
import EmotionTagSelector from './EmotionTagSelector.vue'
import { CATEGORIES, CONDITIONS } from '@/types'
import type { Item, ItemCreate, ItemUpdate, ItemDraftCreate } from '@/types'
import dayjs from 'dayjs'

const props = defineProps<{
  item?: Item | null
}>()

const emit = defineEmits<{
  submit: [data: ItemCreate | ItemUpdate]
  submitDraft: [data: ItemDraftCreate]
  cancel: []
}>()

const itemStore = useItemStore()

type FormState = ItemCreate & {
  status?: Item['status']
  scheduledAt?: string
}

const defaultForm = (): FormState => ({
  title: '',
  description: '',
  story: '',
  price: 0,
  imageUrl: '',
  emotionTags: '',
  category: '',
  condition: '',
  status: 'active',
  scheduledAt: ''
})

const form = reactive<FormState>(defaultForm())

const categories = ref<string[]>([...CATEGORIES])
const conditions = ref<string[]>([...CONDITIONS])
const submitting = ref(false)
const submittingDraft = ref(false)
const error = ref('')
const hasLocalDraft = ref(false)

const minDateTime = computed(() => dayjs().add(1, 'minute').format('YYYY-MM-DDTHH:mm'))

const isValid = computed(() => {
  return form.title.trim() && form.description.trim() && form.story.trim() && form.price >= 0
})

function restoreLocalDraft() {
  const saved = itemStore.getLocalDraft<FormState>()
  if (saved) {
    Object.assign(form, saved)
  }
  hasLocalDraft.value = false
}

function discardLocalDraft() {
  itemStore.clearLocalDraft()
  hasLocalDraft.value = false
}

watch(
  () => props.item,
  (newItem) => {
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
        status: newItem.status,
        scheduledAt: newItem.scheduledAt ? dayjs(newItem.scheduledAt).format('YYYY-MM-DDTHH:mm') : ''
      })
    } else {
      const saved = itemStore.getLocalDraft<FormState>()
      hasLocalDraft.value = !!saved && !!(saved.title || saved.description || saved.story || saved.imageUrl)
    }
  },
  { immediate: true }
)

let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => ({ ...form }),
  (val) => {
    if (props.item) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      itemStore.saveLocalDraft(val)
      hasLocalDraft.value = !!(val.title || val.description || val.story || val.imageUrl)
    }, 1000)
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

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

    if (form.scheduledAt) {
      const scheduledIso = dayjs(form.scheduledAt).toISOString()
      if (dayjs(scheduledIso).isAfter(dayjs())) {
        ;(data as ItemCreate).scheduledAt = scheduledIso
      }
    }

    if (props.item) {
      ;(data as ItemUpdate).status = form.status
      if (form.scheduledAt) {
        const scheduledIso = dayjs(form.scheduledAt).toISOString()
        ;(data as ItemUpdate).scheduledAt = scheduledIso
      }
    }

    emit('submit', data)
  } catch (e) {
    error.value = '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

async function handleSaveDraft() {
  if (submittingDraft.value) return

  error.value = ''
  submittingDraft.value = true

  try {
    const data: ItemDraftCreate = {
      title: form.title.trim() || undefined,
      description: form.description.trim() || undefined,
      story: form.story.trim() || undefined,
      price: Number(form.price) || undefined,
      imageUrl: form.imageUrl || undefined,
      emotionTags: form.emotionTags || undefined,
      category: form.category || undefined,
      condition: form.condition || undefined
    }

    if (form.scheduledAt) {
      const scheduledIso = dayjs(form.scheduledAt).toISOString()
      if (dayjs(scheduledIso).isAfter(dayjs())) {
        data.scheduledAt = scheduledIso
      }
    }

    emit('submitDraft', data)
  } catch (e) {
    error.value = '保存草稿失败，请重试'
  } finally {
    submittingDraft.value = false
  }
}
</script>

<style scoped>
.item-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.draft-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 0.875rem;
}

.draft-notice span {
  flex: 1;
}

.required {
  color: var(--color-accent);
}

.form-hint {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: normal;
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

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-outline:hover {
  background: rgba(99, 102, 241, 0.08);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
}

.btn-ghost:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-wrap: wrap;
  }

  .form-actions .btn {
    flex: 1;
    min-width: 100px;
  }
}
</style>
