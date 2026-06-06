import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api'
import type { Message, MessageStats, MessageQueryParams, PaginatedResponse } from '@/types'

export const useMessageStore = defineStore('message', () => {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const stats = ref<MessageStats | null>(null)
  const statsLoading = ref(false)

  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)
  const unreadCount = computed(() => stats.value?.unread || 0)

  async function fetchMessages(params?: MessageQueryParams): Promise<void> {
    loading.value = true
    try {
      const response = await messageApi.list(params)
      const data = response.data as PaginatedResponse<Message>
      messages.value = data.data
      pagination.value = {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchMoreMessages(params?: MessageQueryParams): Promise<void> {
    if (loading.value || !hasMore.value) return
    loading.value = true
    try {
      const nextPage = pagination.value.page + 1
      const response = await messageApi.list({
        ...params,
        page: nextPage,
        pageSize: pagination.value.pageSize
      })
      const data = response.data as PaginatedResponse<Message>
      messages.value = [...messages.value, ...data.data]
      pagination.value = {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(): Promise<void> {
    statsLoading.value = true
    try {
      const response = await messageApi.getStats()
      stats.value = response.data as MessageStats
    } finally {
      statsLoading.value = false
    }
  }

  async function markAsRead(id: string): Promise<boolean> {
    try {
      await messageApi.markAsRead(id)
      const idx = messages.value.findIndex(m => m.id === id)
      if (idx !== -1) {
        messages.value[idx] = { ...messages.value[idx], isRead: true }
      }
      if (stats.value && stats.value.unread > 0) {
        stats.value.unread -= 1
      }
      return true
    } catch {
      return false
    }
  }

  async function markAllAsRead(): Promise<number> {
    try {
      const response = await messageApi.markAllAsRead()
      const count = (response.data as { count: number }).count || 0
      messages.value = messages.value.map(m => ({ ...m, isRead: true }))
      if (stats.value) {
        stats.value.unread = 0
        stats.value.unreadBidAlert = 0
        stats.value.unreadDealNotice = 0
        stats.value.unreadReviewResult = 0
        stats.value.unreadSystemAnnouncement = 0
      }
      return count
    } catch {
      return 0
    }
  }

  async function deleteMessage(id: string): Promise<boolean> {
    try {
      await messageApi.delete(id)
      messages.value = messages.value.filter(m => m.id !== id)
      if (pagination.value.total > 0) {
        pagination.value.total -= 1
      }
      return true
    } catch {
      return false
    }
  }

  async function clearAll(): Promise<number> {
    try {
      const response = await messageApi.clearAll()
      const count = (response.data as { count: number }).count || 0
      messages.value = []
      pagination.value.total = 0
      pagination.value.page = 1
      pagination.value.totalPages = 0
      if (stats.value) {
        stats.value = {
          total: 0,
          unread: 0,
          bidAlert: 0,
          dealNotice: 0,
          reviewResult: 0,
          systemAnnouncement: 0,
          unreadBidAlert: 0,
          unreadDealNotice: 0,
          unreadReviewResult: 0,
          unreadSystemAnnouncement: 0
        }
      }
      return count
    } catch {
      return 0
    }
  }

  async function sendAnnouncement(title: string, content: string): Promise<number> {
    const response = await messageApi.sendAnnouncement({ title, content })
    return ((response.data as unknown[]) || []).length
  }

  function clearMessages() {
    messages.value = []
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
  }

  return {
    messages,
    loading,
    pagination,
    stats,
    statsLoading,
    hasMore,
    unreadCount,
    fetchMessages,
    fetchMoreMessages,
    fetchStats,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    clearAll,
    sendAnnouncement,
    clearMessages
  }
})
