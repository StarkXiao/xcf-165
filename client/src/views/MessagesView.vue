<template>
  <div class="messages-view">
    <div class="container">
      <div class="messages-header">
        <div>
          <h1 class="page-title">消息中心</h1>
          <p class="page-subtitle">
            共 {{ messageStore.stats?.total || 0 }} 条消息，
            <strong v-if="messageStore.stats?.unread" class="unread-hint">
              {{ messageStore.stats.unread }} 条未读
            </strong>
          </p>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="!messageStore.stats?.unread"
            @click="handleMarkAllRead"
          >
            📭 全部已读
          </button>
          <button
            class="btn btn-danger btn-sm"
            :disabled="!messageStore.stats?.total"
            @click="handleClearAll"
          >
            🗑️ 清空
          </button>
        </div>
      </div>

      <div class="messages-stats" v-if="messageStore.stats">
        <div
          class="stat-item"
          :class="{ active: currentType === 'all' }"
          @click="handleTypeFilter('all')"
        >
          <span class="stat-icon">📨</span>
          <span class="stat-label">全部</span>
          <span class="stat-count">{{ messageStore.stats.total }}</span>
          <span v-if="messageStore.stats.unread" class="stat-badge">{{ messageStore.stats.unread }}</span>
        </div>
        <div
          class="stat-item"
          :class="{ active: currentType === 'bid_alert' }"
          @click="handleTypeFilter('bid_alert')"
        >
          <span class="stat-icon">🏷️</span>
          <span class="stat-label">出价提醒</span>
          <span class="stat-count">{{ messageStore.stats.bidAlert }}</span>
          <span v-if="messageStore.stats.unreadBidAlert" class="stat-badge">{{ messageStore.stats.unreadBidAlert }}</span>
        </div>
        <div
          class="stat-item"
          :class="{ active: currentType === 'deal_notice' }"
          @click="handleTypeFilter('deal_notice')"
        >
          <span class="stat-icon">🛒</span>
          <span class="stat-label">成交通知</span>
          <span class="stat-count">{{ messageStore.stats.dealNotice }}</span>
          <span v-if="messageStore.stats.unreadDealNotice" class="stat-badge">{{ messageStore.stats.unreadDealNotice }}</span>
        </div>
        <div
          class="stat-item"
          :class="{ active: currentType === 'review_result' }"
          @click="handleTypeFilter('review_result')"
        >
          <span class="stat-icon">✅</span>
          <span class="stat-label">审核结果</span>
          <span class="stat-count">{{ messageStore.stats.reviewResult }}</span>
          <span v-if="messageStore.stats.unreadReviewResult" class="stat-badge">{{ messageStore.stats.unreadReviewResult }}</span>
        </div>
        <div
          class="stat-item"
          :class="{ active: currentType === 'system_announcement' }"
          @click="handleTypeFilter('system_announcement')"
        >
          <span class="stat-icon">📢</span>
          <span class="stat-label">系统公告</span>
          <span class="stat-count">{{ messageStore.stats.systemAnnouncement }}</span>
          <span v-if="messageStore.stats.unreadSystemAnnouncement" class="stat-badge">{{ messageStore.stats.unreadSystemAnnouncement }}</span>
        </div>
      </div>

      <div class="messages-tabs">
        <button
          class="msg-tab"
          :class="{ active: currentIsRead === 'all' }"
          @click="handleIsReadFilter('all')"
        >
          全部
        </button>
        <button
          class="msg-tab"
          :class="{ active: currentIsRead === false }"
          @click="handleIsReadFilter(false)"
        >
          未读
          <span v-if="messageStore.stats?.unread" class="tab-badge">{{ messageStore.stats.unread }}</span>
        </button>
        <button
          class="msg-tab"
          :class="{ active: currentIsRead === true }"
          @click="handleIsReadFilter(true)"
        >
          已读
        </button>
      </div>

      <div v-if="messageStore.loading && messageStore.messages.length === 0" class="loading">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="messageStore.messages.length === 0" class="empty">
        <div class="empty-icon">📭</div>
        <p>{{ emptyText }}</p>
        <router-link to="/" class="btn btn-primary">去首页逛逛</router-link>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="msg in messageStore.messages"
          :key="msg.id"
          class="message-card card"
          :class="{ unread: !msg.isRead }"
          @click="handleMessageClick(msg)"
        >
          <div class="msg-left">
            <div
              class="msg-icon"
              :style="{
                background: MESSAGE_TYPE_COLOR[msg.type] + '15',
                color: MESSAGE_TYPE_COLOR[msg.type]
              }"
            >
              {{ MESSAGE_TYPE_ICON[msg.type] }}
            </div>
            <span v-if="!msg.isRead" class="msg-dot"></span>
          </div>

          <div class="msg-body">
            <div class="msg-header">
              <span
                class="msg-type-tag"
                :style="{
                  background: MESSAGE_TYPE_COLOR[msg.type] + '15',
                  color: MESSAGE_TYPE_COLOR[msg.type]
                }"
              >
                {{ MESSAGE_TYPE_LABEL[msg.type] }}
              </span>
              <h3 class="msg-title">{{ msg.title }}</h3>
            </div>
            <p class="msg-content">{{ msg.content }}</p>
            <div class="msg-footer">
              <span class="msg-time">{{ formatDateTime(msg.createdAt) }}</span>
              <span v-if="msg.readAt" class="msg-read-time">
                已读 · {{ formatDateTime(msg.readAt) }}
              </span>
            </div>
          </div>

          <div class="msg-actions" @click.stop>
            <button
              v-if="!msg.isRead"
              class="btn btn-ghost btn-xs"
              title="标记已读"
              @click="handleMarkRead(msg)"
            >
              ✓ 已读
            </button>
            <button
              class="btn btn-ghost btn-xs"
              title="删除"
              @click="handleDelete(msg)"
            >
              🗑️
            </button>
            <router-link
              v-if="msg.relatedType === 'item' && msg.relatedId"
              :to="`/item/${msg.relatedId}`"
              class="btn btn-secondary btn-xs"
            >
              查看详情
            </router-link>
            <router-link
              v-else-if="msg.relatedType === 'order' && msg.relatedId"
              :to="`/orders`"
              class="btn btn-secondary btn-xs"
            >
              查看订单
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="messageStore.hasMore && !messageStore.loading" class="load-more">
        <button class="btn btn-secondary" @click="handleLoadMore">
          加载更多
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessageStore } from '@/stores/messageStore'
import {
  MESSAGE_TYPE_LABEL,
  MESSAGE_TYPE_ICON,
  MESSAGE_TYPE_COLOR,
  type Message,
  type MessageType
} from '@/types'
import dayjs from 'dayjs'

const messageStore = useMessageStore()

const currentType = ref<MessageType | 'all'>('all')
const currentIsRead = ref<boolean | 'all'>('all')

const emptyText = computed(() => {
  const typeText = currentType.value === 'all' ? '' : MESSAGE_TYPE_LABEL[currentType.value]
  const readText = currentIsRead.value === 'all' ? '' : currentIsRead.value ? '已读的' : '未读的'
  return `暂无${readText}${typeText}消息`
})

function formatDateTime(iso: string) {
  const d = dayjs(iso)
  const now = dayjs()
  if (d.isSame(now, 'day')) {
    return d.format('HH:mm')
  }
  if (d.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天 ' + d.format('HH:mm')
  }
  if (d.isSame(now, 'year')) {
    return d.format('MM-DD HH:mm')
  }
  return d.format('YYYY-MM-DD HH:mm')
}

async function fetchMessages() {
  const params: Record<string, unknown> = {}
  if (currentType.value !== 'all') {
    params.type = currentType.value
  }
  if (currentIsRead.value !== 'all') {
    params.isRead = currentIsRead.value
  }
  await messageStore.fetchMessages(params)
}

function handleTypeFilter(type: MessageType | 'all') {
  currentType.value = type
  fetchMessages()
}

function handleIsReadFilter(isRead: boolean | 'all') {
  currentIsRead.value = isRead
  fetchMessages()
}

function handleLoadMore() {
  const params: Record<string, unknown> = {}
  if (currentType.value !== 'all') {
    params.type = currentType.value
  }
  if (currentIsRead.value !== 'all') {
    params.isRead = currentIsRead.value
  }
  messageStore.fetchMoreMessages(params)
}

async function handleMessageClick(msg: Message) {
  if (!msg.isRead) {
    await messageStore.markAsRead(msg.id)
  }
}

async function handleMarkRead(msg: Message) {
  await messageStore.markAsRead(msg.id)
}

async function handleMarkAllRead() {
  if (!confirm('确定要将所有消息标记为已读吗？')) return
  const count = await messageStore.markAllAsRead()
  await messageStore.fetchStats()
  await fetchMessages()
  alert(`已将 ${count} 条消息标记为已读`)
}

async function handleDelete(msg: Message) {
  if (!confirm('确定要删除这条消息吗？')) return
  const success = await messageStore.deleteMessage(msg.id)
  if (!success) {
    alert('删除失败，请重试')
  }
}

async function handleClearAll() {
  if (!confirm('确定要清空所有消息吗？此操作不可恢复。')) return
  const count = await messageStore.clearAll()
  await messageStore.fetchStats()
  alert(`已清空 ${count} 条消息`)
}

onMounted(async () => {
  await messageStore.fetchStats()
  await fetchMessages()
})
</script>

<style scoped>
.messages-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
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
}

.unread-hint {
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.messages-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.stat-item:hover {
  border-color: var(--color-primary);
}

.stat-item.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border-color: transparent;
}

.stat-icon {
  font-size: 1.25rem;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-count {
  font-size: 0.875rem;
  font-weight: 700;
  margin-left: auto;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 9px;
  background: var(--color-accent);
  color: white;
}

.stat-item.active .stat-badge {
  background: rgba(255, 255, 255, 0.25);
}

.messages-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.msg-tab {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.msg-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.msg-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.msg-tab:not(.active) .tab-badge {
  background: var(--color-accent);
  color: white;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-card.unread {
  border-color: var(--color-primary);
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.05), transparent 50%);
}

.message-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.msg-left {
  position: relative;
  flex-shrink: 0;
}

.msg-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.msg-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-surface);
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.msg-type-tag {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.msg-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.unread .msg-title {
  font-weight: 700;
}

.msg-content {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.msg-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.msg-read-time {
  opacity: 0.7;
}

.msg-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-xs {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  border-radius: 6px;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
}

.btn-ghost:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
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

.load-more {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  padding: 0.5rem 1rem;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.btn-danger {
  background: var(--color-accent);
  color: white;
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .messages-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .message-card {
    flex-direction: column;
    align-items: stretch;
  }

  .msg-actions {
    justify-content: flex-start;
  }

  .msg-left {
    display: none;
  }
}
</style>
