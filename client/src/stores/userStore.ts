import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi, itemApi, setToken, removeToken } from '@/api'
import type { UserPublic, UserRegister, UserLogin, UserUpdate, Item, QueryParams, PaginatedResponse } from '@/types'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserPublic | null>(null)
  const isLoggedIn = computed(() => !!currentUser.value)
  const loading = ref(false)
  const myItems = ref<Item[]>([])
  const myItemsLoading = ref(false)
  const myItemsPagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  const myFavorites = ref<Item[]>([])
  const myFavoritesLoading = ref(false)
  const myFavoritesPagination = ref({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0
  })
  const favoriteItems = ref<Set<string>>(new Set())

  async function register(data: UserRegister): Promise<{ success: boolean; message?: string }> {
    loading.value = true
    try {
      const response = await userApi.register(data)
      if (response.code === 201) {
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return { success: false, message: err.response?.data?.message || '注册失败' }
    } finally {
      loading.value = false
    }
  }

  async function login(data: UserLogin): Promise<{ success: boolean; message?: string }> {
    loading.value = true
    try {
      const response = await userApi.login(data)
      if (response.code === 200 && response.data) {
        const authData = response.data
        setToken(authData.token)
        currentUser.value = authData.user
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return { success: false, message: err.response?.data?.message || '登录失败' }
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await userApi.logout()
    } catch {
      // ignore
    }
    removeToken()
    currentUser.value = null
    myItems.value = []
    myFavorites.value = []
    favoriteItems.value.clear()
  }

  async function fetchCurrentUser(): Promise<UserPublic | null> {
    try {
      const response = await userApi.getMe()
      if (response.code === 200 && response.data) {
        currentUser.value = response.data
        return response.data
      }
    } catch {
      removeToken()
      currentUser.value = null
    }
    return null
  }

  async function updateProfile(data: UserUpdate): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await userApi.updateMe(data)
      if (response.code === 200 && response.data) {
        currentUser.value = response.data
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return { success: false, message: err.response?.data?.message || '更新失败' }
    }
  }

  async function fetchMyItems(params?: QueryParams) {
    myItemsLoading.value = true
    try {
      const response = await userApi.getMyItems(params)
      const data = response.data as PaginatedResponse<Item>
      myItems.value = data.data
      myItemsPagination.value = {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      }
    } finally {
      myItemsLoading.value = false
    }
  }

  async function fetchMyFavorites(params?: QueryParams) {
    myFavoritesLoading.value = true
    try {
      const response = await userApi.getMyFavorites(params)
      const data = response.data as PaginatedResponse<Item>
      if (params?.page && params.page > 1) {
        const existingIds = new Set(myFavorites.value.map(i => i.id))
        const newItems = data.data.filter(i => !existingIds.has(i.id))
        myFavorites.value = [...myFavorites.value, ...newItems]
      } else {
        myFavorites.value = data.data
      }
      myFavoritesPagination.value = {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      }
      data.data.forEach(item => favoriteItems.value.add(item.id))
    } finally {
      myFavoritesLoading.value = false
    }
  }

  async function checkFavorite(itemId: string): Promise<boolean> {
    if (favoriteItems.value.has(itemId)) return true
    try {
      const response = await itemApi.checkFavorite(itemId)
      if (response.code === 200 && response.data?.favorited) {
        favoriteItems.value.add(itemId)
        return true
      }
    } catch {
      // ignore
    }
    return false
  }

  async function toggleFavorite(itemId: string): Promise<boolean> {
    const isFav = favoriteItems.value.has(itemId)
    try {
      if (isFav) {
        await itemApi.removeFavorite(itemId)
        favoriteItems.value.delete(itemId)
        myFavorites.value = myFavorites.value.filter(i => i.id !== itemId)
        return false
      } else {
        await itemApi.addFavorite(itemId)
        favoriteItems.value.add(itemId)
        return true
      }
    } catch {
      return isFav
    }
  }

  function clearUser() {
    currentUser.value = null
    myItems.value = []
    myFavorites.value = []
    favoriteItems.value.clear()
  }

  return {
    currentUser,
    isLoggedIn,
    loading,
    myItems,
    myItemsLoading,
    myItemsPagination,
    myFavorites,
    myFavoritesLoading,
    myFavoritesPagination,
    favoriteItems,
    register,
    login,
    logout,
    fetchCurrentUser,
    updateProfile,
    fetchMyItems,
    fetchMyFavorites,
    checkFavorite,
    toggleFavorite,
    clearUser
  }
})
