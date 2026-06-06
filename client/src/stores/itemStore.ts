import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { itemApi } from '@/api'
import type { Item, ItemCreate, ItemUpdate, QueryParams, PaginatedResponse, MetaData, Stats, Bid, BidCreate } from '@/types'

export const useItemStore = defineStore('item', () => {
  const items = ref<Item[]>([])
  const currentItem = ref<Item | null>(null)
  const bids = ref<Bid[]>([])
  const loading = ref(false)
  const bidsLoading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  const metaData = ref<MetaData | null>(null)
  const stats = ref<Stats | null>(null)
  const queryParams = ref<QueryParams>({
    page: 1,
    pageSize: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'active'
  })

  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

  async function fetchItems(params?: QueryParams) {
    loading.value = true
    try {
      if (params) {
        queryParams.value = { ...queryParams.value, ...params }
      }
      const response = await itemApi.list(queryParams.value)
      const data = response.data as PaginatedResponse<Item>
      items.value = data.data
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

  async function fetchMoreItems() {
    if (!hasMore.value || loading.value) return

    loading.value = true
    try {
      const nextPage = pagination.value.page + 1
      const response = await itemApi.list({ ...queryParams.value, page: nextPage })
      const data = response.data as PaginatedResponse<Item>
      items.value = [...items.value, ...data.data]
      pagination.value.page = data.page
    } finally {
      loading.value = false
    }
  }

  async function fetchItemById(id: string) {
    loading.value = true
    try {
      const response = await itemApi.getById(id)
      currentItem.value = response.data as Item
      return currentItem.value
    } finally {
      loading.value = false
    }
  }

  async function fetchMetaData() {
    if (metaData.value) return metaData.value
    const response = await itemApi.getMeta()
    metaData.value = response.data as MetaData
    return metaData.value
  }

  async function fetchStats() {
    const response = await itemApi.getStats()
    stats.value = response.data as Stats
    return stats.value
  }

  async function createItem(data: ItemCreate) {
    const response = await itemApi.create(data)
    const newItem = response.data as Item
    items.value = [newItem, ...items.value]
    return newItem
  }

  async function updateItem(id: string, data: ItemUpdate) {
    const response = await itemApi.update(id, data)
    const updatedItem = response.data as Item
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = updatedItem
    }
    if (currentItem.value?.id === id) {
      currentItem.value = updatedItem
    }
    return updatedItem
  }

  async function deleteItem(id: string) {
    await itemApi.delete(id)
    items.value = items.value.filter(item => item.id !== id)
    if (currentItem.value?.id === id) {
      currentItem.value = null
    }
  }

  async function likeItem(id: string) {
    const response = await itemApi.like(id)
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.likes = response.data.likes
    }
    if (currentItem.value?.id === id) {
      currentItem.value.likes = response.data.likes
    }
    return response.data
  }

  async function uploadImage(file: File) {
    const response = await itemApi.uploadImage(file)
    return response.data
  }

  async function fetchBids(itemId: string) {
    bidsLoading.value = true
    try {
      const response = await itemApi.getBids(itemId)
      bids.value = response.data as Bid[]
      return bids.value
    } finally {
      bidsLoading.value = false
    }
  }

  async function placeBid(itemId: string, data: BidCreate) {
    const response = await itemApi.placeBid(itemId, data)
    const newBid = response.data as Bid
    bids.value = [newBid, ...bids.value]
    if (currentItem.value?.id === itemId) {
      currentItem.value.currentPrice = newBid.amount
      currentItem.value.bidCount = (currentItem.value.bidCount || 0) + 1
    }
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.currentPrice = newBid.amount
      item.bidCount = (item.bidCount || 0) + 1
    }
    return newBid
  }

  async function markItemAsSold(id: string) {
    const response = await itemApi.markAsSold(id)
    const updatedItem = response.data as Item
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = updatedItem
    }
    if (currentItem.value?.id === id) {
      currentItem.value = updatedItem
    }
    return updatedItem
  }

  function setQueryParams(params: Partial<QueryParams>) {
    queryParams.value = { ...queryParams.value, ...params, page: 1 }
  }

  function resetQueryParams() {
    queryParams.value = {
      page: 1,
      pageSize: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'active'
    }
  }

  function clearCurrentItem() {
    currentItem.value = null
    bids.value = []
  }

  return {
    items,
    currentItem,
    bids,
    loading,
    bidsLoading,
    pagination,
    metaData,
    stats,
    queryParams,
    hasMore,
    fetchItems,
    fetchMoreItems,
    fetchItemById,
    fetchMetaData,
    fetchStats,
    createItem,
    updateItem,
    deleteItem,
    likeItem,
    uploadImage,
    fetchBids,
    placeBid,
    markItemAsSold,
    setQueryParams,
    resetQueryParams,
    clearCurrentItem
  }
})
