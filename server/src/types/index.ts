export interface Bid {
  id: string
  itemId: string
  bidder: string
  amount: number
  createdAt: string
}

export interface BidCreate {
  itemId: string
  bidder: string
  amount: number
}

export interface Item {
  id: string
  title: string
  description: string
  story: string
  price: number
  imageUrl: string
  emotionTags: string
  category: string
  condition: string
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  status: 'active' | 'sold' | 'archived'
  currentPrice: number
  bidCount: number
  soldPrice: number | null
}

export interface ItemCreate {
  title: string
  description: string
  story: string
  price: number
  imageUrl: string
  emotionTags: string
  category: string
  condition: string
}

export interface ItemUpdate extends Partial<ItemCreate> {
  status?: 'active' | 'sold' | 'archived'
}

export interface QueryParams {
  page?: number
  pageSize?: number
  category?: string
  emotionTag?: string
  sortBy?: 'createdAt' | 'price' | 'views' | 'likes'
  sortOrder?: 'asc' | 'desc'
  keyword?: string
  status?: string
  minPrice?: number
  maxPrice?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const EMOTION_TAGS = [
  '遗憾', '释怀', '成长', '怀念', '告别',
  '释然', '心痛', '感恩', '新生', '遗忘'
] as const

export const CATEGORIES = [
  '服饰配饰', '数码产品', '书籍文具', '家居用品',
  '运动户外', '美妆护肤', '收藏品', '其他'
] as const

export const CONDITIONS = [
  '全新', '几乎全新', '轻微使用', '明显使用', '有瑕疵'
] as const
