export interface Bid {
  id: string
  itemId: string
  bidder: string
  bidderId: string | null
  amount: number
  createdAt: string
}

export interface BidCreate {
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

export interface ItemCreate {
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

export interface MetaData {
  emotionTags: string[]
  categories: string[]
  conditions: string[]
}

export interface Stats {
  total: number
  draft: number
  scheduled: number
  active: number
  sold: number
  totalViews: number
  totalLikes: number
  totalSoldAmount: number
  totalBidCount: number
  highestPrice: number
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

export interface OrderStats {
  total: number
  pending: number
  confirmed: number
  paid: number
  shipped: number
  completed: number
  cancelled: number
  totalAmount: number
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消'
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#6366f1',
  paid: '#8b5cf6',
  shipped: '#0ea5e9',
  completed: '#22c55e',
  cancelled: '#64748b'
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
  rejectReason: string | null
  rejectReasonId: string | null
  reviewerId: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  replies?: Comment[]
  itemTitle?: string
}

export interface CommentReject {
  rejectReason?: string
  rejectReasonId?: string
  remark?: string
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

export interface CommentStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export const COMMENT_STATUS_LABEL: Record<CommentStatus | 'all', string> = {
  all: '全部',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

export const COMMENT_STATUS_COLOR: Record<CommentStatus, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444'
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

export const MESSAGE_TYPE_LABEL: Record<MessageType | 'all', string> = {
  all: '全部',
  bid_alert: '出价提醒',
  deal_notice: '成交通知',
  review_result: '审核结果',
  system_announcement: '系统公告'
}

export const MESSAGE_TYPE_ICON: Record<MessageType, string> = {
  bid_alert: '🏷️',
  deal_notice: '🛒',
  review_result: '✅',
  system_announcement: '📢'
}

export const MESSAGE_TYPE_COLOR: Record<MessageType, string> = {
  bid_alert: '#f59e0b',
  deal_notice: '#6366f1',
  review_result: '#22c55e',
  system_announcement: '#ef4444'
}

type OrderAction = 'confirm' | 'markPaid' | 'markShipped' | 'complete' | 'cancel'
type OrderRole = 'buyer' | 'seller'

const ORDER_ACTION_PERMISSIONS: Record<string, OrderRole[]> = {
  'pending→confirm': ['seller'],
  'pending→cancel': ['buyer', 'seller'],
  'confirmed→markPaid': ['buyer'],
  'confirmed→cancel': ['buyer', 'seller'],
  'paid→markShipped': ['seller'],
  'paid→cancel': ['seller'],
  'shipped→complete': ['buyer']
}

export function canPerformOrderAction(
  order: Order,
  action: OrderAction,
  userId: string
): boolean {
  const isBuyer = order.buyerId === userId
  const isSeller = order.sellerId === userId

  const actionKey = `${order.status}→${action}`
  const allowedRoles = ORDER_ACTION_PERMISSIONS[actionKey]

  if (!allowedRoles) return false
  if (allowedRoles.includes('buyer') && isBuyer) return true
  if (allowedRoles.includes('seller') && isSeller) return true
  return false
}

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

export interface DashboardItemStats {
  total: number
  draft: number
  scheduled: number
  active: number
  sold: number
  archived: number
}

export interface DashboardSalesStats {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalSalesAmount: number
  averageOrderAmount: number
}

export interface DashboardEmotionStats {
  tag: string
  count: number
  percentage: number
}

export interface DashboardVisitTrend {
  date: string
  views: number
  items: number
  orders: number
}

export interface DashboardData {
  itemStats: DashboardItemStats
  salesStats: DashboardSalesStats
  emotionStats: DashboardEmotionStats[]
  visitTrend: DashboardVisitTrend[]
  totalViews: number
  totalLikes: number
  totalBidCount: number
  userCount: number
}

export type SensitiveWordCategory = 'politics' | 'violence' | 'pornography' | 'ad' | 'insult' | 'other'

export const SENSITIVE_WORD_CATEGORY_LABEL: Record<SensitiveWordCategory | 'all', string> = {
  all: '全部',
  politics: '政治敏感',
  violence: '暴力内容',
  pornography: '色情内容',
  ad: '广告垃圾',
  insult: '辱骂攻击',
  other: '其他违规'
}

export const SENSITIVE_WORD_CATEGORY_COLOR: Record<SensitiveWordCategory, string> = {
  politics: '#ef4444',
  violence: '#f97316',
  pornography: '#ec4899',
  ad: '#f59e0b',
  insult: '#dc2626',
  other: '#64748b'
}

export type SensitiveWordLevel = 'low' | 'medium' | 'high'

export const SENSITIVE_WORD_LEVEL_LABEL: Record<SensitiveWordLevel | 'all', string> = {
  all: '全部',
  low: '低危',
  medium: '中危',
  high: '高危'
}

export const SENSITIVE_WORD_LEVEL_COLOR: Record<SensitiveWordLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444'
}

export interface SensitiveWord {
  id: string
  word: string
  category: SensitiveWordCategory
  level: SensitiveWordLevel
  createdAt: string
  updatedAt: string
}

export interface SensitiveWordCreate {
  word: string
  category: SensitiveWordCategory
  level?: SensitiveWordLevel
}

export interface SensitiveWordUpdate {
  word?: string
  category?: SensitiveWordCategory
  level?: SensitiveWordLevel
}

export interface SensitiveWordQueryParams {
  page?: number
  pageSize?: number
  category?: SensitiveWordCategory | 'all'
  level?: SensitiveWordLevel | 'all'
  keyword?: string
}

export interface SensitiveWordMatch {
  word: string
  category: SensitiveWordCategory
  level: SensitiveWordLevel
  start: number
  end: number
}

export interface ContentCheckResult {
  passed: boolean
  matches: SensitiveWordMatch[]
  highestLevel: 'none' | SensitiveWordLevel
  suggestedAction: 'pass' | 'review' | 'block'
}

export type ReviewableType = 'comment' | 'item' | 'message'

export type ReviewAction = 'approve' | 'reject'

export const REVIEW_ACTION_LABEL: Record<ReviewAction | 'all', string> = {
  all: '全部',
  approve: '通过',
  reject: '驳回'
}

export const REVIEW_ACTION_COLOR: Record<ReviewAction, string> = {
  approve: '#22c55e',
  reject: '#ef4444'
}

export const REVIEWABLE_TYPE_LABEL: Record<ReviewableType | 'all', string> = {
  all: '全部',
  comment: '留言',
  item: '藏品',
  message: '消息'
}

export interface ReviewRecord {
  id: string
  targetId: string
  targetType: ReviewableType
  reviewerId: string
  reviewerName: string
  action: ReviewAction
  rejectReason: string | null
  rejectReasonId: string | null
  beforeStatus: string
  afterStatus: string
  remark: string | null
  createdAt: string
}

export interface ReviewRecordQueryParams {
  page?: number
  pageSize?: number
  targetType?: ReviewableType | 'all'
  action?: ReviewAction | 'all'
  targetId?: string
  reviewerId?: string
  startDate?: string
  endDate?: string
}

export interface RejectReasonTemplate {
  id: string
  title: string
  description: string
  category: string
  isDefault: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface RejectReasonTemplateCreate {
  title: string
  description: string
  category?: string
  isDefault?: boolean
  sortOrder?: number
}

export interface RejectReasonTemplateUpdate {
  title?: string
  description?: string
  category?: string
  isDefault?: boolean
  sortOrder?: number
}

export interface ModerationStats {
  totalReviewed: number
  approved: number
  rejected: number
  pending: number
  sensitiveWordCount: number
  autoBlocked: number
  autoFlagged: number
}

export interface SalesArchive {
  id: string
  orderId: string | null
  itemId: string
  itemTitle: string
  itemImageUrl: string | null
  sellerId: string | null
  buyerId: string | null
  buyerName: string
  destination: string | null
  finalPrice: number
  farewellMessage: string | null
  emotionTags: string
  category: string
  archivedAt: string
  createdAt: string
  updatedAt: string
}

export interface SalesArchiveCreate {
  orderId?: string
  itemId: string
  itemTitle?: string
  itemImageUrl?: string
  sellerId?: string
  buyerId?: string
  buyerName?: string
  destination?: string
  finalPrice?: number
  farewellMessage?: string
  emotionTags?: string
  category?: string
}

export interface SalesArchiveUpdate {
  destination?: string
  finalPrice?: number
  farewellMessage?: string
}

export interface SalesArchiveQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  category?: string
  emotionTag?: string
  startDate?: string
  endDate?: string
  minPrice?: number
  maxPrice?: number
}

export interface SalesArchiveStats {
  total: number
  totalSalesAmount: number
  averagePrice: number
  categoryCounts: Record<string, number>
  emotionTagCounts: Record<string, number>
}
