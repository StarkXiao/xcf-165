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
  CommentReject,
  Message,
  MessageQueryParams,
  MessageStats,
  DashboardData,
  SensitiveWord,
  SensitiveWordCreate,
  SensitiveWordUpdate,
  SensitiveWordQueryParams,
  ContentCheckResult,
  ReviewRecord,
  ReviewRecordQueryParams,
  RejectReasonTemplate,
  RejectReasonTemplateCreate,
  RejectReasonTemplateUpdate,
  ModerationStats,
  SalesArchive,
  SalesArchiveCreate,
  SalesArchiveUpdate,
  SalesArchiveQueryParams,
  SalesArchiveStats
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

  approve(id: string, remark?: string): Promise<ApiResponse<Comment>> {
    return api.post(`/comments/${id}/approve`, remark ? { remark } : {})
  },

  reject(id: string, data?: CommentReject): Promise<ApiResponse<Comment>> {
    return api.post(`/comments/${id}/reject`, data || {})
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

export const dashboardApi = {
  getOverview(days?: number): Promise<ApiResponse<DashboardData>> {
    return api.get('/dashboard/overview', days ? { params: { days } } : undefined)
  }
}

export const moderationApi = {
  getStats(): Promise<ApiResponse<ModerationStats>> {
    return api.get('/moderation/stats')
  },

  checkContent(content: string): Promise<ApiResponse<ContentCheckResult>> {
    return api.post('/moderation/check', { content })
  },

  listSensitiveWords(params?: SensitiveWordQueryParams): Promise<ApiResponse<PaginatedResponse<SensitiveWord>>> {
    return api.get('/moderation/sensitive-words', { params })
  },

  getSensitiveWordById(id: string): Promise<ApiResponse<SensitiveWord>> {
    return api.get(`/moderation/sensitive-words/${id}`)
  },

  createSensitiveWord(data: SensitiveWordCreate): Promise<ApiResponse<SensitiveWord>> {
    return api.post('/moderation/sensitive-words', data)
  },

  batchCreateSensitiveWords(words: SensitiveWordCreate[]): Promise<ApiResponse<{ created: number; skipped: number; errors: string[] }>> {
    return api.post('/moderation/sensitive-words/batch', { words })
  },

  updateSensitiveWord(id: string, data: SensitiveWordUpdate): Promise<ApiResponse<SensitiveWord>> {
    return api.put(`/moderation/sensitive-words/${id}`, data)
  },

  deleteSensitiveWord(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/moderation/sensitive-words/${id}`)
  },

  listReviewRecords(params?: ReviewRecordQueryParams): Promise<ApiResponse<PaginatedResponse<ReviewRecord>>> {
    return api.get('/moderation/review-records', { params })
  },

  getReviewRecordsByTarget(targetType: string, targetId: string): Promise<ApiResponse<ReviewRecord[]>> {
    return api.get(`/moderation/review-records/target/${targetType}/${targetId}`)
  },

  listRejectReasonTemplates(category?: string): Promise<ApiResponse<RejectReasonTemplate[]>> {
    return api.get('/moderation/reject-reasons', category ? { params: { category } } : undefined)
  },

  getRejectReasonTemplateById(id: string): Promise<ApiResponse<RejectReasonTemplate>> {
    return api.get(`/moderation/reject-reasons/${id}`)
  },

  createRejectReasonTemplate(data: RejectReasonTemplateCreate): Promise<ApiResponse<RejectReasonTemplate>> {
    return api.post('/moderation/reject-reasons', data)
  },

  updateRejectReasonTemplate(id: string, data: RejectReasonTemplateUpdate): Promise<ApiResponse<RejectReasonTemplate>> {
    return api.put(`/moderation/reject-reasons/${id}`, data)
  },

  deleteRejectReasonTemplate(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/moderation/reject-reasons/${id}`)
  }
}

export const salesArchiveApi = {
  create(data: SalesArchiveCreate): Promise<ApiResponse<SalesArchive>> {
    return api.post('/sales-archives', data)
  },

  getById(id: string): Promise<ApiResponse<SalesArchive>> {
    return api.get(`/sales-archives/${id}`)
  },

  list(params?: SalesArchiveQueryParams): Promise<ApiResponse<PaginatedResponse<SalesArchive>>> {
    return api.get('/sales-archives', { params })
  },

  getStats(): Promise<ApiResponse<SalesArchiveStats>> {
    return api.get('/sales-archives/stats')
  },

  update(id: string, data: SalesArchiveUpdate): Promise<ApiResponse<SalesArchive>> {
    return api.put(`/sales-archives/${id}`, data)
  },

  delete(id: string): Promise<ApiResponse<null>> {
    return api.delete(`/sales-archives/${id}`)
  },

  exportCsv(params?: SalesArchiveQueryParams): Promise<Blob> {
    return api.get('/sales-archives/export', {
      params,
      responseType: 'blob'
    })
  }
}

export default api
