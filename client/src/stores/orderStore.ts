import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { orderApi } from '@/api'
import type { Order, OrderCreate, OrderQueryParams, PaginatedResponse, OrderStats } from '@/types'

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)
  const stats = ref<OrderStats | null>(null)
  const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  const queryParams = ref<OrderQueryParams>({
    page: 1,
    pageSize: 10,
    role: 'all'
  })

  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

  async function createOrder(data: OrderCreate): Promise<Order> {
    const response = await orderApi.create(data)
    const newOrder = response.data as Order
    orders.value = [newOrder, ...orders.value]
    return newOrder
  }

  async function fetchOrderById(id: string) {
    loading.value = true
    try {
      const response = await orderApi.getById(id)
      currentOrder.value = response.data as Order
      return currentOrder.value
    } finally {
      loading.value = false
    }
  }

  async function fetchOrders(params?: OrderQueryParams) {
    loading.value = true
    try {
      if (params) {
        queryParams.value = { ...queryParams.value, ...params }
      }
      const response = await orderApi.list(queryParams.value)
      const data = response.data as PaginatedResponse<Order>
      orders.value = data.data
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

  async function fetchMoreOrders() {
    if (!hasMore.value || loading.value) return

    loading.value = true
    try {
      const nextPage = pagination.value.page + 1
      const response = await orderApi.list({ ...queryParams.value, page: nextPage })
      const data = response.data as PaginatedResponse<Order>
      orders.value = [...orders.value, ...data.data]
      pagination.value.page = data.page
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    const response = await orderApi.getStats()
    stats.value = response.data as OrderStats
    return stats.value
  }

  function updateOrderInList(updatedOrder: Order) {
    const index = orders.value.findIndex(o => o.id === updatedOrder.id)
    if (index !== -1) {
      orders.value[index] = updatedOrder
    }
    if (currentOrder.value?.id === updatedOrder.id) {
      currentOrder.value = updatedOrder
    }
  }

  async function confirmOrder(id: string) {
    const response = await orderApi.confirm(id)
    const updatedOrder = response.data as Order
    updateOrderInList(updatedOrder)
    return updatedOrder
  }

  async function markOrderPaid(id: string) {
    const response = await orderApi.markPaid(id)
    const updatedOrder = response.data as Order
    updateOrderInList(updatedOrder)
    return updatedOrder
  }

  async function markOrderShipped(id: string) {
    const response = await orderApi.markShipped(id)
    const updatedOrder = response.data as Order
    updateOrderInList(updatedOrder)
    return updatedOrder
  }

  async function completeOrder(id: string) {
    const response = await orderApi.complete(id)
    const updatedOrder = response.data as Order
    updateOrderInList(updatedOrder)
    return updatedOrder
  }

  async function cancelOrder(id: string) {
    const response = await orderApi.cancel(id)
    const updatedOrder = response.data as Order
    updateOrderInList(updatedOrder)
    return updatedOrder
  }

  function clearCurrentOrder() {
    currentOrder.value = null
  }

  function resetQueryParams() {
    queryParams.value = {
      page: 1,
      pageSize: 10,
      role: 'all'
    }
  }

  return {
    orders,
    currentOrder,
    loading,
    stats,
    pagination,
    queryParams,
    hasMore,
    createOrder,
    fetchOrderById,
    fetchOrders,
    fetchMoreOrders,
    fetchStats,
    confirmOrder,
    markOrderPaid,
    markOrderShipped,
    completeOrder,
    cancelOrder,
    clearCurrentOrder,
    resetQueryParams
  }
})
