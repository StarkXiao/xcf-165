import axios from 'axios'
import type {
  Item,
  ItemCreate,
  ItemDraftCreate,
  ItemUpdate,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
  MetaData,
  Stats,
  Bid,
  BidCreate,
  UserPublic,
  UserRegister,
  UserLogin,
  UserUpdate,
  AuthPayload,
  Favorite,
  Order,
  OrderCreate,
  OrderQueryParams,
  OrderStats,
  CalendarQueryParams,
  CalendarData,
  Comment,
  CommentCreate,
  CommentQueryParams,
  CommentStats,
  Message,
  MessageQueryParams,
  MessageStats
} from '@/types'

const TOKEN_KEY = 'solo_auth_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    if (error.response?.status === 401) {
      removeToken()
    }
    return Promise.reject(error)
  }
)

export const itemApi = {
  list(params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Item>>> {
    return api.get('/items', { params })
  },

  getById(id: string): Promise<ApiResponse<Item>> {
    return api.get(`/items/${id}`)
  },

  getMeta(): Promise<ApiResponse<MetaData>> {
    return api.get('/items/meta')
  },

  getStats(): Promise<ApiResponse<Stats>> {
    return api.get('/items/stats')
  },

  create(data: ItemCreate): Promise<ApiResponse<Item>> {
    return api.post('/items', data)
  },

  createDraft(data: ItemDraftCreate): Promise<ApiResponse<Item>> {
    return api.post('/items/drafts', data)
  },

  update(id: string, data: ItemUpdate): Promise<ApiResponse<Item>> {
    return api.put(`/items/${id}`, data)
  },

  delete(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/items/${id}`)
  },

  like(id: string): Promise<ApiResponse<{ likes: number }>> {
    return api.post(`/items/${id}/like`)
  },

  uploadImage(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/items/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  getBids(id: string): Promise<ApiResponse<Bid[]>> {
    return api.get(`/items/${id}/bids`)
  },

  placeBid(id: string, data: BidCreate): Promise<ApiResponse<Bid>> {
    return api.post(`/items/${id}/bids`, data)
  },

  markAsSold(id: string): Promise<ApiResponse<Item>> {
    return api.post(`/items/${id}/sold`)
  },

  getCalendar(params?: CalendarQueryParams): Promise<ApiResponse<CalendarData>> {
    return api.get('/items/calendar', { params })
  },

  checkFavorite(id: string): Promise<ApiResponse<{ favorited: boolean }>> {
    return api.get(`/items/${id}/favorite`)
  },

  addFavorite(id: string): Promise<ApiResponse<Favorite>> {
    return api.post(`/items/${id}/favorite`)
  },

  removeFavorite(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/items/${id}/favorite`)
  }
}

export const userApi = {
  register(data: UserRegister): Promise<ApiResponse<UserPublic>> {
    return api.post('/users/register', data)
  },

  login(data: UserLogin): Promise<ApiResponse<AuthPayload>> {
    return api.post('/users/login', data)
  },

  logout(): Promise<ApiResponse<null>> {
    return api.post('/users/logout')
  },

  getMe(): Promise<ApiResponse<UserPublic>> {
    return api.get('/users/me')
  },

  updateMe(data: UserUpdate): Promise<ApiResponse<UserPublic>> {
    return api.put('/users/me', data)
  },

  getById(id: string): Promise<ApiResponse<UserPublic>> {
    return api.get(`/users/${id}`)
  },

  getUserItems(id: string, params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Item>>> {
    return api.get(`/users/${id}/items`, { params })
  },

  getMyItems(params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Item>>> {
    return api.get('/users/me/items', { params })
  },

  getMyFavorites(params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Item>>> {
    return api.get('/users/me/favorites', { params })
  }
}

export const orderApi = {
  create(data: OrderCreate): Promise<ApiResponse<Order>> {
    return api.post('/orders', data)
  },

  getById(id: string): Promise<ApiResponse<Order>> {
    return api.get(`/orders/${id}`)
  },

  list(params?: OrderQueryParams): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return api.get('/orders', { params })
  },

  getStats(role?: 'buyer' | 'seller' | 'all'): Promise<ApiResponse<OrderStats>> {
    return api.get('/orders/stats', role ? { params: { role } } : undefined)
  },

  confirm(id: string): Promise<ApiResponse<Order>> {
    return api.post(`/orders/${id}/confirm`)
  },

  markPaid(id: string): Promise<ApiResponse<Order>> {
    return api.post(`/orders/${id}/paid`)
  },

  markShipped(id: string): Promise<ApiResponse<Order>> {
    return api.post(`/orders/${id}/shipped`)
  },

  complete(id: string): Promise<ApiResponse<Order>> {
    return api.post(`/orders/${id}/complete`)
  },

  cancel(id: string): Promise<ApiResponse<Order>> {
    return api.post(`/orders/${id}/cancel`)
  }
}

export const commentApi = {
  getByItem(itemId: string): Promise<ApiResponse<Comment[]>> {
    return api.get(`/comments/item/${itemId}`)
  },

  create(data: CommentCreate): Promise<ApiResponse<Comment>> {
    return api.post('/comments', data)
  },

  list(params?: CommentQueryParams): Promise<ApiResponse<PaginatedResponse<Comment>>> {
    return api.get('/comments', { params })
  },

  getStats(): Promise<ApiResponse<CommentStats>> {
    return api.get('/comments/stats')
  },

  approve(id: string): Promise<ApiResponse<Comment>> {
    return api.post(`/comments/${id}/approve`)
  },

  reject(id: string): Promise<ApiResponse<Comment>> {
    return api.post(`/comments/${id}/reject`)
  },

  delete(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/comments/${id}`)
  }
}

export const messageApi = {
  list(params?: MessageQueryParams): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return api.get('/messages', { params })
  },

  getById(id: string): Promise<ApiResponse<Message>> {
    return api.get(`/messages/${id}`)
  },

  getStats(): Promise<ApiResponse<MessageStats>> {
    return api.get('/messages/stats')
  },

  markAsRead(id: string): Promise<ApiResponse<Message>> {
    return api.put(`/messages/${id}/read`)
  },

  markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    return api.put('/messages/read-all')
  },

  delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete(`/messages/${id}`)
  },

  clearAll(): Promise<ApiResponse<{ count: number }>> {
    return api.delete('/messages')
  },

  sendAnnouncement(data: { title: string; content: string }): Promise<ApiResponse<Message[]>> {
    return api.post('/messages/announcement', data)
  }
}

export default api
