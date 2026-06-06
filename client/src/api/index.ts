import axios from 'axios'
import type {
  Item,
  ItemCreate,
  ItemUpdate,
  QueryParams,
  PaginatedResponse,
  ApiResponse,
  MetaData,
  Stats,
  Bid,
  BidCreate
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
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
  }
}

export default api
