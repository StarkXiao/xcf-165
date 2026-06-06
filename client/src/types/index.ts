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

export interface MetaData {
  emotionTags: string[]
  categories: string[]
  conditions: string[]
}

export interface Stats {
  total: number
  active: number
  sold: number
  totalViews: number
  totalLikes: number
}

export type Theme = 'light' | 'dark' | 'warm' | 'cool'

export interface ThemeConfig {
  name: Theme
  label: string
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  accent: string
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

export const THEMES: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    label: '明亮',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    accent: '#f43f5e'
  },
  dark: {
    name: 'dark',
    label: '暗黑',
    primary: '#818cf8',
    secondary: '#a78bfa',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#fb7185'
  },
  warm: {
    name: 'warm',
    label: '温暖',
    primary: '#f97316',
    secondary: '#ef4444',
    background: '#fef3c7',
    surface: '#fffbeb',
    text: '#78350f',
    textSecondary: '#92400e',
    border: '#fcd34d',
    accent: '#dc2626'
  },
  cool: {
    name: 'cool',
    label: '清冷',
    primary: '#0891b2',
    secondary: '#0d9488',
    background: '#ecfeff',
    surface: '#f0fdfa',
    text: '#164e63',
    textSecondary: '#0f766e',
    border: '#67e8f9',
    accent: '#0284c7'
  }
}
