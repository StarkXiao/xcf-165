<template>
  <div class="moderation-view">
    <div class="container">
      <div class="moderation-header">
        <div>
          <h1 class="page-title">⚙️ 审核管理</h1>
          <p class="page-subtitle">敏感词规则、驳回原因模板与审核记录追踪</p>
        </div>
        <router-link to="/manage" class="btn btn-secondary">
          ← 返回管理
        </router-link>
      </div>

      <div class="moderation-stats" v-if="stats">
        <div class="stat-card">
          <span class="stat-icon">📋</span>
          <div class="stat-content">
            <span class="stat-value">{{ stats.totalReviewed }}</span>
            <span class="stat-label">已审核总数</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✅</span>
          <div class="stat-content">
            <span class="stat-value">{{ stats.approved }}</span>
            <span class="stat-label">已通过</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">❌</span>
          <div class="stat-content">
            <span class="stat-value">{{ stats.rejected }}</span>
            <span class="stat-label">已驳回</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">⏳</span>
          <div class="stat-content">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">待审核留言</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🚫</span>
          <div class="stat-content">
            <span class="stat-value">{{ stats.sensitiveWordCount }}</span>
            <span class="stat-label">敏感词总数</span>
          </div>
        </div>
      </div>

      <div class="moderation-tabs">
        <button
          class="mod-tab"
          :class="{ active: activeTab === 'sensitive' }"
          @click="activeTab = 'sensitive'"
        >
          🚫 敏感词规则
        </button>
        <button
          class="mod-tab"
          :class="{ active: activeTab === 'reject' }"
          @click="activeTab = 'reject'"
        >
          📝 驳回原因模板
        </button>
        <button
          class="mod-tab"
          :class="{ active: activeTab === 'records' }"
          @click="activeTab = 'records'"
        >
          📜 审核记录
        </button>
      </div>

      <div v-if="activeTab === 'sensitive'">
        <div class="section-header">
          <div>
            <h2 class="section-title">敏感词规则管理</h2>
            <p class="section-subtitle">自动拦截含有违规内容的留言</p>
          </div>
          <div class="section-actions">
            <button class="btn btn-secondary btn-sm" @click="showBatchModal = true">
              📥 批量导入
            </button>
            <button class="btn btn-primary btn-sm" @click="openSensitiveForm()">
              + 新增敏感词
            </button>
          </div>
        </div>

        <div class="filter-bar">
          <div class="filter-item">
            <label class="filter-label">分类</label>
            <select v-model="swFilter.category" class="form-select-sm" @change="fetchSensitiveWords()">
              <option v-for="(label, key) in SENSITIVE_WORD_CATEGORY_LABEL" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">级别</label>
            <select v-model="swFilter.level" class="form-select-sm" @change="fetchSensitiveWords()">
              <option v-for="(label, key) in SENSITIVE_WORD_LEVEL_LABEL" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="filter-item filter-search">
            <input
              v-model="swFilter.keyword"
              type="text"
              class="form-input-sm"
              placeholder="搜索敏感词..."
              @keyup.enter="fetchSensitiveWords()"
            />
          </div>
        </div>

        <div v-if="swLoading && sensitiveWords.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="sensitiveWords.length === 0" class="empty">
          <div class="empty-icon">🚫</div>
          <p>暂无敏感词规则</p>
          <p class="empty-hint">添加敏感词可自动检测和拦截违规内容</p>
        </div>
        <div v-else class="sensitive-table card">
          <table>
            <thead>
              <tr>
                <th>敏感词</th>
                <th>分类</th>
                <th>级别</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sw in sensitiveWords" :key="sw.id">
                <td class="sw-word">{{ sw.word }}</td>
                <td>
                  <span class="tag" :style="{ background: SENSITIVE_WORD_CATEGORY_COLOR[sw.category] + '15', color: SENSITIVE_WORD_CATEGORY_COLOR[sw.category] }">
                    {{ SENSITIVE_WORD_CATEGORY_LABEL[sw.category] }}
                  </span>
                </td>
                <td>
                  <span class="tag" :style="{ background: SENSITIVE_WORD_LEVEL_COLOR[sw.level] + '15', color: SENSITIVE_WORD_LEVEL_COLOR[sw.level] }">
                    {{ SENSITIVE_WORD_LEVEL_LABEL[sw.level] }}
                  </span>
                </td>
                <td class="sw-time">{{ formatDateTime(sw.createdAt) }}</td>
                <td class="sw-actions">
                  <button class="btn btn-link btn-sm" @click="openSensitiveForm(sw)">编辑</button>
                  <button class="btn btn-link btn-sm danger" @click="handleDeleteSensitive(sw)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="swPagination.totalPages > 1" class="pagination">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="swPagination.page <= 1"
            @click="handleSensitivePage(swPagination.page - 1)"
          >
            上一页
          </button>
          <span class="page-info">
            第 {{ swPagination.page }} / {{ swPagination.totalPages }} 页（共 {{ swPagination.total }} 条）
          </span>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="swPagination.page >= swPagination.totalPages"
            @click="handleSensitivePage(swPagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'reject'">
        <div class="section-header">
          <div>
            <h2 class="section-title">驳回原因模板</h2>
            <p class="section-subtitle">预设常用驳回原因，快速选择使用</p>
          </div>
          <button class="btn btn-primary btn-sm" @click="openRejectForm()">
            + 新增模板
          </button>
        </div>

        <div v-if="rtLoading && rejectTemplates.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="rejectTemplates.length === 0" class="empty">
          <div class="empty-icon">📝</div>
          <p>暂无驳回原因模板</p>
          <p class="empty-hint">创建模板可在驳回留言时快速选择</p>
        </div>
        <div v-else class="reject-template-list">
          <div v-for="tpl in rejectTemplates" :key="tpl.id" class="reject-template-card card">
            <div class="rt-header">
              <div class="rt-title">
                {{ tpl.title }}
                <span v-if="tpl.isDefault" class="tag default">默认</span>
              </div>
              <span class="rt-category">{{ tpl.category }}</span>
            </div>
            <div class="rt-desc">{{ tpl.description }}</div>
            <div class="rt-footer">
              <span class="rt-time">创建于 {{ formatDateTime(tpl.createdAt) }}</span>
              <div class="rt-actions">
                <button class="btn btn-link btn-sm" @click="openRejectForm(tpl)">编辑</button>
                <button class="btn btn-link btn-sm danger" @click="handleDeleteReject(tpl)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'records'">
        <div class="section-header">
          <div>
            <h2 class="section-title">审核记录</h2>
            <p class="section-subtitle">所有内容审核操作的完整追踪</p>
          </div>
        </div>

        <div class="filter-bar">
          <div class="filter-item">
            <label class="filter-label">目标类型</label>
            <select v-model="rrFilter.targetType" class="form-select-sm" @change="fetchReviewRecords()">
              <option v-for="(label, key) in REVIEWABLE_TYPE_LABEL" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">操作类型</label>
            <select v-model="rrFilter.action" class="form-select-sm" @change="fetchReviewRecords()">
              <option v-for="(label, key) in REVIEW_ACTION_LABEL" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="rrLoading && reviewRecords.length === 0" class="loading">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="reviewRecords.length === 0" class="empty">
          <div class="empty-icon">📜</div>
          <p>暂无审核记录</p>
          <p class="empty-hint">审核操作将在此处显示完整追踪</p>
        </div>
        <div v-else class="review-records">
          <div v-for="r in reviewRecords" :key="r.id" class="review-record-card card">
            <div class="rr-header">
              <div class="rr-operator">
                <div class="rr-avatar">{{ r.reviewerName.slice(0, 1) }}</div>
                <div>
                  <div class="rr-name">{{ r.reviewerName }}</div>
                  <div class="rr-time">{{ formatDateTime(r.createdAt) }}</div>
                </div>
              </div>
              <div class="rr-tags">
                <span class="tag type">{{ REVIEWABLE_TYPE_LABEL[r.targetType] }}</span>
                <span class="tag action" :style="{ background: REVIEW_ACTION_COLOR[r.action] + '15', color: REVIEW_ACTION_COLOR[r.action] }">
                  {{ REVIEW_ACTION_LABEL[r.action] }}
                </span>
              </div>
            </div>
            <div class="rr-status">
              <span class="status-before">{{ COMMENT_STATUS_LABEL[r.beforeStatus as CommentStatus] || r.beforeStatus }}</span>
              <span class="arrow">→</span>
              <span class="status-after">{{ COMMENT_STATUS_LABEL[r.afterStatus as CommentStatus] || r.afterStatus }}</span>
            </div>
            <div v-if="r.rejectReason" class="rr-reject">
              <strong>驳回原因：</strong>{{ r.rejectReason }}
            </div>
            <div v-if="r.remark" class="rr-remark">
              <strong>备注：</strong>{{ r.remark }}
            </div>
            <div class="rr-target">
              目标ID：<code>{{ r.targetId.slice(0, 12) }}...</code>
            </div>
          </div>
        </div>

        <div v-if="rrPagination.totalPages > 1" class="pagination">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="rrPagination.page <= 1"
            @click="handleRecordsPage(rrPagination.page - 1)"
          >
            上一页
          </button>
          <span class="page-info">
            第 {{ rrPagination.page }} / {{ rrPagination.totalPages }} 页（共 {{ rrPagination.total }} 条）
          </span>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="rrPagination.page >= rrPagination.totalPages"
            @click="handleRecordsPage(rrPagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showSensitiveModal" class="modal-overlay" @click.self="closeSensitiveForm">
          <div class="modal-content modal-content-sm">
            <div class="modal-header">
              <h2>{{ editingSensitive ? '编辑敏感词' : '新增敏感词' }}</h2>
              <button class="btn btn-ghost btn-sm" @click="closeSensitiveForm">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">敏感词 <span class="required">*</span></label>
                <input v-model="sensitiveForm.word" type="text" class="form-input" placeholder="请输入敏感词" />
              </div>
              <div class="form-group">
                <label class="form-label">分类 <span class="required">*</span></label>
                <select v-model="sensitiveForm.category" class="form-select">
                  <option v-for="(label, key) in SENSITIVE_WORD_CATEGORY_LABEL" :key="key" :value="key" :disabled="key === 'all'">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">级别</label>
                <select v-model="sensitiveForm.level" class="form-select">
                  <option v-for="(label, key) in SENSITIVE_WORD_LEVEL_LABEL" :key="key" :value="key" :disabled="key === 'all'">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" :disabled="submitting || !sensitiveForm.word.trim()" @click="submitSensitive">
                  {{ submitting ? '保存中...' : '保存' }}
                </button>
                <button class="btn btn-secondary" @click="closeSensitiveForm" :disabled="submitting">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showBatchModal" class="modal-overlay" @click.self="showBatchModal = false">
          <div class="modal-content modal-content-sm">
            <div class="modal-header">
              <h2>批量导入敏感词</h2>
              <button class="btn btn-ghost btn-sm" @click="showBatchModal = false">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">分类</label>
                <select v-model="batchForm.category" class="form-select">
                  <option v-for="(label, key) in SENSITIVE_WORD_CATEGORY_LABEL" :key="key" :value="key" :disabled="key === 'all'">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">级别</label>
                <select v-model="batchForm.level" class="form-select">
                  <option v-for="(label, key) in SENSITIVE_WORD_LEVEL_LABEL" :key="key" :value="key" :disabled="key === 'all'">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">敏感词列表 <span class="required">*</span></label>
                <textarea
                  v-model="batchForm.wordsText"
                  class="form-textarea"
                  rows="6"
                  placeholder="每行一个敏感词，例如：&#10;违禁词1&#10;违禁词2&#10;违禁词3"
                ></textarea>
                <div class="form-hint">每行一个，重复的会被自动跳过</div>
              </div>
              <div v-if="batchResult" class="batch-result">
                导入结果：成功 <strong class="success">{{ batchResult.created }}</strong> 条，跳过 <strong>{{ batchResult.skipped }}</strong> 条
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" :disabled="batchSubmitting || !batchForm.wordsText.trim()" @click="submitBatchSensitive">
                  {{ batchSubmitting ? '导入中...' : '开始导入' }}
                </button>
                <button class="btn btn-secondary" @click="showBatchModal = false" :disabled="batchSubmitting">
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectForm">
          <div class="modal-content modal-content-sm">
            <div class="modal-header">
              <h2>{{ editingReject ? '编辑驳回模板' : '新增驳回模板' }}</h2>
              <button class="btn btn-ghost btn-sm" @click="closeRejectForm">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">标题 <span class="required">*</span></label>
                <input v-model="rejectForm.title" type="text" class="form-input" placeholder="简短标题，如：内容违规" />
              </div>
              <div class="form-group">
                <label class="form-label">描述（驳回原因正文） <span class="required">*</span></label>
                <textarea v-model="rejectForm.description" class="form-textarea" rows="3" placeholder="请输入详细的驳回原因说明"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">分类</label>
                <input v-model="rejectForm.category" type="text" class="form-input" placeholder="例如：general / content / spam" />
              </div>
              <div class="form-group">
                <label class="form-checkbox">
                  <input type="checkbox" v-model="rejectForm.isDefault" />
                  <span>设为默认模板（同分类下会自动取消其他默认）</span>
                </label>
              </div>
              <div class="form-group">
                <label class="form-label">排序（数值越小越靠前）</label>
                <input v-model.number="rejectForm.sortOrder" type="number" class="form-input" />
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" :disabled="submitting || !rejectForm.title.trim() || !rejectForm.description.trim()" @click="submitReject">
                  {{ submitting ? '保存中...' : '保存' }}
                </button>
                <button class="btn btn-secondary" @click="closeRejectForm" :disabled="submitting">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { moderationApi } from '@/api'
import type {
  ModerationStats,
  SensitiveWord,
  SensitiveWordCreate,
  SensitiveWordUpdate,
  SensitiveWordCategory,
  SensitiveWordLevel,
  SensitiveWordQueryParams,
  RejectReasonTemplate,
  RejectReasonTemplateCreate,
  RejectReasonTemplateUpdate,
  ReviewRecord,
  ReviewRecordQueryParams,
  PaginatedResponse,
  CommentStatus
} from '@/types'
import {
  SENSITIVE_WORD_CATEGORY_LABEL,
  SENSITIVE_WORD_CATEGORY_COLOR,
  SENSITIVE_WORD_LEVEL_LABEL,
  SENSITIVE_WORD_LEVEL_COLOR,
  REVIEWABLE_TYPE_LABEL,
  REVIEW_ACTION_LABEL,
  REVIEW_ACTION_COLOR,
  COMMENT_STATUS_LABEL
} from '@/types'
import dayjs from 'dayjs'

const activeTab = ref<'sensitive' | 'reject' | 'records'>('sensitive')
const stats = ref<ModerationStats | null>(null)

const sensitiveWords = ref<SensitiveWord[]>([])
const swLoading = ref(false)
const swPagination = reactive({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const swFilter = reactive<SensitiveWordQueryParams>({ category: 'all', level: 'all', keyword: '', page: 1, pageSize: 20 })

const rejectTemplates = ref<RejectReasonTemplate[]>([])
const rtLoading = ref(false)

const reviewRecords = ref<ReviewRecord[]>([])
const rrLoading = ref(false)
const rrPagination = reactive({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const rrFilter = reactive<ReviewRecordQueryParams>({ targetType: 'all', action: 'all', page: 1, pageSize: 20 })

const showSensitiveModal = ref(false)
const showBatchModal = ref(false)
const showRejectModal = ref(false)
const submitting = ref(false)
const batchSubmitting = ref(false)

const editingSensitive = ref<SensitiveWord | null>(null)
const sensitiveForm = reactive<SensitiveWordCreate>({ word: '', category: 'other', level: 'medium' })

const batchForm = reactive({ wordsText: '', category: 'other' as SensitiveWordCategory, level: 'medium' as SensitiveWordLevel })
const batchResult = ref<{ created: number; skipped: number; errors: string[] } | null>(null)

const editingReject = ref<RejectReasonTemplate | null>(null)
const rejectForm = reactive<RejectReasonTemplateCreate>({ title: '', description: '', category: 'general', isDefault: false, sortOrder: 0 })

function formatDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm')
}

onMounted(async () => {
  await fetchStats()
  await fetchSensitiveWords()
  await fetchRejectTemplates()
  await fetchReviewRecords()
})

async function fetchStats() {
  try {
    const res = await moderationApi.getStats()
    stats.value = res.data as ModerationStats
  } catch (e) {
    console.warn('获取审核统计失败', e)
  }
}

async function fetchSensitiveWords() {
  swLoading.value = true
  try {
    const params: SensitiveWordQueryParams = {
      ...swFilter,
      page: swPagination.page,
      pageSize: swPagination.pageSize
    }
    const res = await moderationApi.listSensitiveWords(params)
    const data = res.data as PaginatedResponse<SensitiveWord>
    sensitiveWords.value = data.data
    swPagination.total = data.total
    swPagination.page = data.page
    swPagination.totalPages = data.totalPages
  } finally {
    swLoading.value = false
  }
}

function handleSensitivePage(page: number) {
  swPagination.page = page
  fetchSensitiveWords()
}

function openSensitiveForm(sw?: SensitiveWord) {
  editingSensitive.value = sw || null
  if (sw) {
    sensitiveForm.word = sw.word
    sensitiveForm.category = sw.category
    sensitiveForm.level = sw.level
  } else {
    sensitiveForm.word = ''
    sensitiveForm.category = 'other'
    sensitiveForm.level = 'medium'
  }
  showSensitiveModal.value = true
}

function closeSensitiveForm() {
  showSensitiveModal.value = false
  editingSensitive.value = null
}

async function submitSensitive() {
  if (!sensitiveForm.word.trim()) return
  submitting.value = true
  try {
    if (editingSensitive.value) {
      const update: SensitiveWordUpdate = {
        word: sensitiveForm.word,
        category: sensitiveForm.category,
        level: sensitiveForm.level
      }
      await moderationApi.updateSensitiveWord(editingSensitive.value.id, update)
    } else {
      await moderationApi.createSensitiveWord({ ...sensitiveForm })
    }
    closeSensitiveForm()
    await fetchStats()
    await fetchSensitiveWords()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '保存失败，请重试'
    alert(msg)
  } finally {
    submitting.value = false
  }
}

async function handleDeleteSensitive(sw: SensitiveWord) {
  if (!confirm(`确定要删除敏感词「${sw.word}」吗？`)) return
  try {
    await moderationApi.deleteSensitiveWord(sw.id)
    await fetchStats()
    await fetchSensitiveWords()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '删除失败，请重试'
    alert(msg)
  }
}

async function submitBatchSensitive() {
  if (!batchForm.wordsText.trim()) return
  const lines = batchForm.wordsText.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return
  batchSubmitting.value = true
  batchResult.value = null
  try {
    const words = lines.map(word => ({ word, category: batchForm.category, level: batchForm.level }))
    const res = await moderationApi.batchCreateSensitiveWords(words)
    batchResult.value = res.data as { created: number; skipped: number; errors: string[] }
    await fetchStats()
    await fetchSensitiveWords()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '导入失败，请重试'
    alert(msg)
  } finally {
    batchSubmitting.value = false
  }
}

async function fetchRejectTemplates() {
  rtLoading.value = true
  try {
    const res = await moderationApi.listRejectReasonTemplates()
    rejectTemplates.value = res.data as RejectReasonTemplate[]
  } finally {
    rtLoading.value = false
  }
}

function openRejectForm(tpl?: RejectReasonTemplate) {
  editingReject.value = tpl || null
  if (tpl) {
    rejectForm.title = tpl.title
    rejectForm.description = tpl.description
    rejectForm.category = tpl.category
    rejectForm.isDefault = tpl.isDefault
    rejectForm.sortOrder = tpl.sortOrder
  } else {
    rejectForm.title = ''
    rejectForm.description = ''
    rejectForm.category = 'general'
    rejectForm.isDefault = false
    rejectForm.sortOrder = 0
  }
  showRejectModal.value = true
}

function closeRejectForm() {
  showRejectModal.value = false
  editingReject.value = null
}

async function submitReject() {
  if (!rejectForm.title.trim() || !rejectForm.description.trim()) return
  submitting.value = true
  try {
    if (editingReject.value) {
      const update: RejectReasonTemplateUpdate = { ...rejectForm }
      await moderationApi.updateRejectReasonTemplate(editingReject.value.id, update)
    } else {
      await moderationApi.createRejectReasonTemplate({ ...rejectForm })
    }
    closeRejectForm()
    await fetchRejectTemplates()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '保存失败，请重试'
    alert(msg)
  } finally {
    submitting.value = false
  }
}

async function handleDeleteReject(tpl: RejectReasonTemplate) {
  if (!confirm(`确定要删除驳回模板「${tpl.title}」吗？`)) return
  try {
    await moderationApi.deleteRejectReasonTemplate(tpl.id)
    await fetchRejectTemplates()
  } catch (e: any) {
    const msg = e?.response?.data?.message || '删除失败，请重试'
    alert(msg)
  }
}

async function fetchReviewRecords() {
  rrLoading.value = true
  try {
    const params: ReviewRecordQueryParams = {
      ...rrFilter,
      page: rrPagination.page,
      pageSize: rrPagination.pageSize
    }
    const res = await moderationApi.listReviewRecords(params)
    const data = res.data as PaginatedResponse<ReviewRecord>
    reviewRecords.value = data.data
    rrPagination.total = data.total
    rrPagination.page = data.page
    rrPagination.totalPages = data.totalPages
  } finally {
    rrLoading.value = false
  }
}

function handleRecordsPage(page: number) {
  rrPagination.page = page
  fetchReviewRecords()
}
</script>

<style scoped>
.moderation-view {
  min-height: 100vh;
  padding: 2rem 0;
}

.moderation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--color-text-secondary);
  margin: 0;
}

.moderation-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.moderation-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.mod-tab {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mod-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.mod-tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: transparent;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.section-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-search {
  flex: 1;
  min-width: 200px;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-select-sm,
.form-input-sm {
  padding: 0.4rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.875rem;
  min-width: 140px;
}

.form-select-sm:focus,
.form-input-sm:focus {
  outline: none;
  border-color: var(--color-primary);
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 0.75rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.7;
  margin: 0;
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
  to { transform: rotate(360deg); }
}

.sensitive-table {
  overflow: hidden;
  padding: 0;
}

.sensitive-table table {
  width: 100%;
  border-collapse: collapse;
}

.sensitive-table th,
.sensitive-table td {
  padding: 0.875rem 1.25rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9375rem;
}

.sensitive-table th {
  background: var(--color-background);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sensitive-table tbody tr:last-child td {
  border-bottom: none;
}

.sensitive-table tbody tr:hover {
  background: var(--color-background);
}

.sw-word {
  font-weight: 600;
  color: var(--color-text);
  font-family: monospace;
}

.sw-time {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.sw-actions {
  display: flex;
  gap: 0.75rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag.default {
  background: var(--color-primary);
  color: white;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem 0;
}

.page-info {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.reject-template-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.reject-template-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.rt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rt-title {
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rt-category {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.rt-desc {
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-size: 0.9375rem;
  flex: 1;
}

.rt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.625rem;
  border-top: 1px solid var(--color-border);
}

.rt-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.rt-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  font-weight: 500;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-link.danger {
  color: #ef4444;
}

.review-records {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-record-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.rr-operator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.rr-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9375rem;
}

.rr-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.rr-time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.125rem;
}

.rr-tags {
  display: flex;
  gap: 0.375rem;
}

.rr-tags .tag.type {
  background: var(--color-background);
  color: var(--color-text-secondary);
}

.rr-status {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
}

.status-before,
.status-after {
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.status-after {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.arrow {
  color: var(--color-text-secondary);
}

.rr-reject,
.rr-remark {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text);
  padding: 0.625rem 0.875rem;
  background: var(--color-background);
  border-radius: 8px;
}

.rr-reject strong,
.rr-remark strong {
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-right: 0.25rem;
}

.rr-target {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.rr-target code {
  font-family: monospace;
  background: var(--color-background);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  color: var(--color-primary);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content-sm {
  max-width: 520px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
}

.btn-ghost:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  border: none;
  font-size: 0.9375rem;
  font-family: inherit;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: 1px solid #ef4444;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  resize: vertical;
  line-height: 1.6;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-hint {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.form-checkbox input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.batch-result {
  padding: 0.875rem 1rem;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.9375rem;
}

.batch-result .success {
  color: #22c55e;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 968px) {
  .moderation-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .moderation-header,
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .form-select-sm,
  .form-input-sm {
    width: 100%;
  }

  .sw-actions,
  .rt-actions,
  .form-actions {
    flex-wrap: wrap;
  }

  .sensitive-table {
    overflow-x: auto;
  }
}
</style>
