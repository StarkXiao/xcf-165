<template>
  <div class="image-uploader">
    <div v-if="previewUrl" class="image-preview">
      <img :src="previewUrl" alt="预览" />
      <button class="remove-btn" @click="handleRemove" v-if="!disabled">
        <span>✕</span>
      </button>
    </div>

    <label v-else class="upload-area" :class="{ disabled ? 'disabled' : '' }">
      <input
        type="file"
        type="file"
        accept="image/*"
        @change="handleFileChange"
        :disabled="disabled"
      />
      <div class="upload-content">
        <span class="upload-icon">📷</span>
        <span class="upload-text">{{ uploading ? '上传中...' : '点击上传图片' }}</span>
        <span class="upload-hint">支持 JPG、PNG、GIF、WebP，最大 5MB</span>
      </div>
    </label>

    <div v-if="error" class="upload-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useItemStore } from '@/stores/itemStore'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
}>()

const itemStore = useItemStore()
const previewUrl = ref(props.modelValue)
const uploading = ref(false)
const error = ref('')

watch(() => props.modelValue, (newVal) => {
  previewUrl.value = newVal
})

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  error.value = ''

  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = '图片大小不能超过 5MB'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  uploading.value = true

  try {
    const result = await itemStore.uploadImage(file)
    emit('update:modelValue', result.url)
  } catch (e) {
    error.value = '上传失败，请重试'
    previewUrl.value = props.modelValue
  } finally {
    uploading.value = false
  }

  input.value = ''
}

function handleRemove() {
  previewUrl.value = ''
  emit('update:modelValue', '')
}
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.upload-area {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  background: var(--color-background);
}

.upload-area:hover:not(.disabled) {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.05);
}

.upload-area.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-area input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.upload-icon {
  font-size: 3rem;
}

.upload-text {
  font-weight: 500;
  color: var(--color-text);
}

.upload-hint {
  font-size: 0.75rem;
}

.image-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.remove-btn:hover {
  background: var(--color-accent);
}

.upload-error {
  color: var(--color-accent);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>
