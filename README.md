# 💔 分手遗物拍卖行

让每一件旧物都有新的归宿，让每一段回忆都能好好告别。

## 📖 项目介绍

"分手遗物拍卖行"是一个让用户将旧物整理成带故事的拍品进行展示的全站应用。每一件藏品都承载着一段回忆，通过情绪标签、故事叙述，让它们找到下一个懂它的人。

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 官方状态管理
- **Vue Router** - Vue 官方路由
- **Axios** - HTTP 客户端
- **Day.js** - 轻量级日期处理库

### 后端
- **Node.js** - JavaScript 运行时
- **Koa** - 下一代 Web 框架
- **TypeScript** - 类型安全
- **Better-SQLite3** - 高性能 SQLite 驱动
- **@koa/router** - Koa 路由中间件
- **@koa/cors** - CORS 跨域支持
- **koa-body** - 请求体解析
- **koa-static** - 静态文件服务

## 📁 项目结构

```
.
├── client/                    # 前端项目
│   ├── src/
│   │   ├── api/               # API 服务层
│   │   │   └── index.ts
│   │   ├── components/        # 组件
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── ThemeSwitcher.vue
│   │   │   ├── ItemCard.vue
│   │   │   ├── ImageUploader.vue
│   │   │   ├── EmotionTagSelector.vue
│   │   │   ├── FilterBar.vue
│   │   │   └── ItemForm.vue
│   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── itemStore.ts
│   │   │   └── themeStore.ts
│   │   ├── types/             # TypeScript 类型定义
│   │   │   └── index.ts
│   │   ├── views/             # 页面视图
│   │   │   ├── HomeView.vue
│   │   │   ├── ItemDetailView.vue
│   │   │   └── ManageView.vue
│   │   ├── router/            # 路由配置
│   │   │   └── index.ts
│   │   ├── styles/            # 全局样式
│   │   │   └── global.css
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                    # 后端项目
│   ├── src/
│   │   ├── config/            # 配置
│   │   │   └── index.ts
│   │   ├── database/          # 数据库
│   │   │   └── index.ts
│   │   ├── middleware/        # 中间件
│   │   │   └── errorHandler.ts
│   │   ├── routes/            # 路由
│   │   │   └── itemRoutes.ts
│   │   ├── services/          # 业务逻辑
│   │   │   ├── itemService.ts
│   │   │   └── uploadService.ts
│   │   ├── types/             # 类型定义
│   │   │   └── index.ts
│   │   ├── seed.ts            # 种子数据
│   │   └── index.ts           # 入口文件
│   ├── uploads/               # 上传目录
│   ├── data/                  # 数据库目录
│   ├── package.json
│   └── tsconfig.json
│
├── package.json               # 根目录配置
├── .gitignore
└── README.md
```

## ✨ 功能模块

### 1. 藏品管理
- 藏品的增删改查
- 支持多状态管理（正在拍卖、已成交、已下架）
- 批量管理界面

### 2. 图片上传预览
- 拖拽上传
- 图片预览
- 支持 JPG、PNG、GIF、WebP 格式
- 最大 5MB 限制
- 自动生成 UUID 文件名

### 3. 情绪标签
- 10 种情绪标签：遗憾、释怀、成长、怀念、告别、释然、心痛、感恩、新生、遗忘
- 多选标签
- 标签筛选功能

### 4. 筛选排序
- 关键词搜索
- 分类筛选
- 情绪标签筛选
- 价格区间筛选
- 按发布时间、价格、浏览量、点赞数排序
- 升序/降序切换

### 5. 主题皮肤
- 4 种主题：明亮、暗黑、温暖、清冷
- CSS 变量实现主题切换
- 本地存储主题偏好
- 平滑过渡动画

### 6. 接口服务
- RESTful API 设计
- 统一响应格式
- 错误处理中间件
- CORS 跨域支持

### 7. 数据存储
- SQLite 本地数据库
- 索引优化
- WAL 模式提升性能
- 外键约束

## 🚀 快速开始

### 环境要求
- Node.js >= 16.x
- npm >= 7.x

### 安装依赖

```bash
# 一键安装所有依赖
npm run install:all
```

或者分别安装：

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 初始化数据（可选）

后端包含12条精心设计的种子数据，可一键导入：

```bash
cd server
npm run seed
```

### 启动开发服务

```bash
# 同时启动前后端（推荐）
npm run dev

# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client
```

启动后访问：
- 前端: http://localhost:5173
- 后端: http://localhost:3001

### 生产构建

```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

## 🔌 API 文档

### 藏品接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items` | 获取藏品列表（支持分页、筛选、排序） |
| GET | `/api/items/meta` | 获取元数据（标签、分类、成色） |
| GET | `/api/items/stats` | 获取统计数据 |
| GET | `/api/items/:id` | 获取藏品详情 |
| POST | `/api/items` | 创建藏品 |
| PUT | `/api/items/:id` | 更新藏品 |
| DELETE | `/api/items/:id` | 删除藏品 |
| POST | `/api/items/:id/like` | 点赞藏品 |
| POST | `/api/items/upload` | 上传图片 |

### 查询参数

```
GET /api/items?page=1&pageSize=12&category=收藏品&emotionTag=遗憾&sortBy=price&sortOrder=asc&keyword=礼物&minPrice=100&maxPrice=1000&status=active
```

### 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 🎨 主题配置

### 内置主题

| 主题 | 主色调 | 氛围 |
|------|--------|------|
| ☀️ 明亮 | 靛蓝 | 清爽明亮 |
| 🌙 暗黑 | 亮蓝 | 夜间护眼 |
| 🔥 温暖 | 橙红 | 温馨治愈 |
| ❄️ 清冷 | 青色 | 冷静理性 |

### 自定义主题

在 `client/src/types/index.ts` 中修改 `THEMES` 对象即可添加新主题：

```typescript
export const THEMES: Record<Theme, ThemeConfig> = {
  custom: {
    name: 'custom',
    label: '自定义',
    primary: '#...',
    secondary: '#...',
    background: '#...',
    surface: '#...',
    text: '#...',
    textSecondary: '#...',
    border: '#...',
    accent: '#...'
  }
}
```

## 📝 情绪标签说明

| 标签 | 含义 |
|------|------|
| 遗憾 | 未完成的遗憾 |
| 释怀 | 已经放下 |
| 成长 | 从中学会了什么 |
| 怀念 | 单纯的想念 |
| 告别 | 正式说再见 |
| 释然 | 内心平静 |
| 心痛 | 还会难过 |
| 感恩 | 感谢对方 |
| 新生 | 开启新生活 |
| 遗忘 | 想要忘记 |

## 🏷️ 物品分类

- 服饰配饰
- 数码产品
- 书籍文具
- 家居用品
- 运动户外
- 美妆护肤
- 收藏品
- 其他

## 🔧 开发说明

### 数据库表结构

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  story TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  imageUrl TEXT,
  emotionTags TEXT,
  category TEXT,
  condition TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);
```

### 状态码说明

| 状态 | 说明 |
|------|------|
| active | 正在拍卖 |
| sold | 已成交 |
| archived | 已下架 |

## 📄 License

MIT License

## 💝 结语

每一件旧物都承载着独一无二的故事。
在这里，它们不仅是商品，更是一段回忆的载体。
愿每一件藏品都能找到懂它的新主人，
愿每一个人都能带着回忆，继续前行。

> "分手不是结束，而是另一种开始。"
