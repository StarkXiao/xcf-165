<template>
  <div class="emotion-tags">
    <div class="tags-list">
      <button
        v-for="tag in availableTags"
        :key="tag"
        class="tag-btn"
        :class="{ active: selectedTags.includes(tag) }"
        @click="toggleTag(tag)"
        :disabled="disabled"
      >
        {{ tag }}
      </button>
    </div>
    <div v-if="selectedTags.length > 0" class="selected-preview">
      已选择: {{ selectedTags.join(', ') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useItemStore } from '@/stores/itemStore'
import { EMOTION_TAGS } from '@/types'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const itemStore = useItemStore()
const availableTags = ref<string[]>([...EMOTION_TAGS])
const selectedTags = ref<string[]>([])

onMounted(async () => {
  try {
    const meta = await itemStore.fetchMetaData()
    if (meta?.emotionTags?.length) {
      availableTags.value = meta.emotionTags
    }
  } catch (e) {
      // use default
    }
})

watch(() => props.modelValue, (newVal) => {
  selectedTags.value = newVal ? newVal.split(',').filter(Boolean) : []
}, { immediate: true })

function toggleTag(tag: string) {
  if (props.disabled) return

  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
  emit('update:modelValue', selectedTags.value.join(','))
}
</script>

<style scoped>
.emotion-tags {
  width: 100%;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-btn {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tag-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.05);
}

.tag-btn.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: transparent;
}

.tag-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selected-preview {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
</style>
