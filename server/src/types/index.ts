export interface Bid {
  id: string
  itemId: string
  bidder: string
  bidderId: string | null
  amount: number
  createdAt: string
}

export interface BidCreate {
  itemId: string
  bidder: string
  bidderId?: string
  amount: number
}

export interface Item {
  id: string
  ownerId: string | null
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
  status: 'draft' | 'scheduled' | 'active' | 'sold' | 'archived'
  currentPrice: number
  bidCount: number
  soldPrice: number | null
  scheduledAt: string | null
  publishedAt: string | null
}

export interface ItemCreate {
  ownerId?: string
  title: string
  description: string
  story: string
  price: number
  imageUrl: string
  emotionTags: string
  category: string
  condition: string
  scheduledAt?: string
}

export interface ItemDraftCreate {
  ownerId?: string
  title?: string
  description?: string
  story?: string
  price?: number
  imageUrl?: string
  emotionTags?: string
  category?: string
  condition?: string
  scheduledAt?: string
}

export interface ItemUpdate extends Partial<ItemCreate> {
  status?: 'draft' | 'scheduled' | 'active' | 'sold' | 'archived'
  scheduledAt?: string
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

export interface User {
  id: string
  username: string
  password: string
  nickname: string | null
  avatar: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface UserPublic {
  id: string
  username: string
  nickname: string | null
  avatar: string | null
  bio: string | null
  createdAt: string
}

export interface UserRegister {
  username: string
  password: string
  nickname?: string
}

export interface UserLogin {
  username: string
  password: string
}

export interface UserUpdate {
  nickname?: string
  avatar?: string
  bio?: string
  password?: string
}

export interface Favorite {
  id: string
  userId: string
  itemId: string
  createdAt: string
}

export interface AuthPayload {
  userId: string
  token: string
  user: UserPublic
}

export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'completed' | 'cancelled'

export interface Order {
  id: string
  itemId: string
  itemTitle: string
  itemImageUrl: string | null
  sellerId: string | null
  buyerId: string | null
  buyerName: string
  buyerPhone: string | null
  buyerAddress: string | null
  price: number
  status: OrderStatus
  remark: string | null
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
  paidAt: string | null
  shippedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
}

export interface OrderCreate {
  itemId: string
  buyerName?: string
  buyerPhone?: string
  buyerAddress?: string
  remark?: string
}

export interface OrderQueryParams {
  page?: number
  pageSize?: number
  status?: OrderStatus
  keyword?: string
  role?: 'buyer' | 'seller' | 'all'
}

export interface CalendarQueryParams {
  year?: number
  month?: number
  emotionTag?: string
  status?: string
}

export interface CalendarDayItem {
  date: string
  items: Item[]
  count: number
}

export interface CalendarData {
  year: number
  month: number
  days: CalendarDayItem[]
  totalItems: number
  emotionTagCounts: Record<string, number>
}

export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface Comment {
  id: string
  itemId: string
  userId: string | null
  username: string
  parentId: string | null
  content: string
  status: CommentStatus
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

export interface CommentCreate {
  itemId: string
  username?: string
  parentId?: string
  content: string
}

export interface CommentQueryParams {
  page?: number
  pageSize?: number
  status?: CommentStatus | 'all'
  itemId?: string
  keyword?: string
}

export type MessageType = 'bid_alert' | 'deal_notice' | 'review_result' | 'system_announcement'

export interface Message {
  id: string
  userId: string
  type: MessageType
  title: string
  content: string
  data: string | null
  isRead: boolean
  relatedId: string | null
  relatedType: string | null
  createdAt: string
  readAt: string | null
}

export interface MessageCreate {
  userId: string
  type: MessageType
  title: string
  content: string
  data?: Record<string, unknown>
  relatedId?: string
  relatedType?: string
}

export interface MessageQueryParams {
  page?: number
  pageSize?: number
  type?: MessageType | 'all'
  isRead?: boolean | 'all'
}

export interface MessageStats {
  total: number
  unread: number
  bidAlert: number
  dealNotice: number
  reviewResult: number
  systemAnnouncement: number
  unreadBidAlert: number
  unreadDealNotice: number
  unreadReviewResult: number
  unreadSystemAnnouncement: number
}
