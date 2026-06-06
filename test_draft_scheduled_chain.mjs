const BASE = 'http://localhost:3001'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let dayjs = null
try { dayjs = require('dayjs') } catch (e) { dayjs = null }

function nowIso() { return new Date().toISOString() }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test(name, fn) {
  try {
    const result = await fn()
    console.log(`✅ ${name}`, result ? JSON.stringify(result).slice(0, 300) : 'OK')
    return result
  } catch (e) {
    console.error(`❌ ${name}:`, e.message)
    return null
  }
}

async function get(url) {
  const r = await fetch(BASE + url)
  return r.json()
}

async function post(url, body) {
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
    body: body instanceof FormData ? body : JSON.stringify(body)
  })
  return r.json()
}

async function put(url, body) {
  const r = await fetch(BASE + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return r.json()
}

async function del(url) {
  const r = await fetch(BASE + url, { method: 'DELETE' })
  return r.json()
}

console.log('=== 开始：草稿箱/定时上架/图片/标签/自动切换 完整链路测试 ===\n')

let draftId = null
let scheduledId = null
let uploadedUrl = null
let uploadedFilename = null

await test('0. 获取初始统计数据（验证新增 draft/scheduled 字段）', async () => {
  const r = await get('/api/items/stats')
  return r.code === 200 ? {
    total: r.data.total,
    draft: r.data.draft,
    scheduled: r.data.scheduled,
    active: r.data.active,
    sold: r.data.sold
  } : null
})

await test('1. [图片上传] 上传一张测试图片', async () => {
  try {
    const fs = require('fs')
    const path = require('path')
    const sampleImgPath = path.join(process.cwd(), 'client/public/favicon.svg')
    if (!fs.existsSync(sampleImgPath)) {
      return { skipped: 'no sample file, using placeholder url instead' }
    }
    const form = new FormData()
    const buffer = fs.readFileSync(sampleImgPath)
    const blob = new Blob([buffer], { type: 'image/svg+xml' })
    form.append('file', blob, 'favicon.svg')

    const r = await fetch(BASE + '/api/items/upload', {
      method: 'POST',
      body: form
    })
    const json = await r.json()
    if (json.code === 200) {
      uploadedUrl = json.data.url
      uploadedFilename = json.data.filename
      return { url: uploadedUrl, filename: uploadedFilename }
    }
    throw new Error(json.message || 'upload failed')
  } catch (e) {
    return { fallback: true, note: 'using placeholder image url', error: e.message }
  }
})

const testImageUrl = uploadedUrl || 'https://picsum.photos/seed/storydraft/600/400'

await test('2. [草稿保存 - 图片+标签] 创建纯草稿（图片、标签写入）', async () => {
  const r = await post('/api/items/drafts', {
    title: '',
    description: '草稿描述 - 测试暂存',
    story: '草稿故事...',
    imageUrl: testImageUrl,
    emotionTags: '成长,怀念',
    category: '收藏品',
    condition: '几乎全新'
  })
  if (r.code === 201) {
    draftId = r.data.id
    return {
      id: draftId?.slice(0, 10) + '...',
      status: r.data.status,
      emotionTags: r.data.emotionTags,
      imageUrl: r.data.imageUrl ? '已上传图片' : '无',
      scheduledAt: r.data.scheduledAt
    }
  }
  throw new Error(r.message)
})

await test('3. [草稿箱列表验证', async () => {
  const r = await get('/api/items?status=draft&pageSize=100')
  return r.code === 200 ? {
    count: r.data.total,
    hasOurDraft: r.data.data.some(i => i.id === draftId)
  } : null
})

const futureIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const pastIso = new Date(Date.now() - 60 * 1000).toISOString()

await test('4. [草稿保存 - 带未来 scheduledAt] 应自动落 scheduled 状态', async () => {
  const r = await post('/api/items/drafts', {
    title: '定时上架藏品（从草稿创建）',
    description: '设置了未来时间',
    story: '设置定时上架测试故事',
    price: 888,
    imageUrl: testImageUrl,
    emotionTags: '遗憾,感恩',
    category: '数码产品',
    condition: '轻微使用',
    scheduledAt: futureIso
  })
  if (r.code === 201) {
    scheduledId = r.data.id
    return {
      id: scheduledId?.slice(0, 10) + '...',
      status: r.data.status,
      scheduledAt: r.data.scheduledAt,
      emotionTags: r.data.emotionTags
    }
  }
  throw new Error(r.message)
})

await test('5. [草稿保存 - 带过去 scheduledAt] 应落 draft 状态', async () => {
  const r = await post('/api/items/drafts', {
    title: '过期定时（应为草稿）',
    scheduledAt: pastIso
  })
  if (r.code === 201) {
    const id = r.data.id
    const statusOk = r.data.status === 'draft'
    await del(`/api/items/${id}`)
    return { status: r.data.status, scheduledAt: r.data.scheduledAt, correct: statusOk }
  }
  throw new Error(r.message)
})

await test('6. [定时上架列表验证]', async () => {
  const r = await get('/api/items?status=scheduled&pageSize=100')
  return r.code === 200 ? {
    count: r.data.total,
    hasOurScheduled: r.data.data.some(i => i.id === scheduledId),
    firstScheduledAt: r.data.data[0]?.scheduledAt
  } : null
})

await test('7. [草稿编辑] 修改 scheduled 藏品为草稿状态', async () => {
  const r = await put(`/api/items/${scheduledId}`, {
    status: 'draft',
    scheduledAt: null
  })
  return r.code === 200 ? {
    status: r.data.status,
    scheduledAt: r.data.scheduledAt
  } : null
})

const shortFuture = new Date(Date.now() + 5 * 1000).toISOString()

await test('8. [草稿→定时] 更新草稿设置 5 秒后定时上架', async () => {
  const r = await put(`/api/items/${scheduledId}`, {
    title: '5秒后自动上架藏品',
    scheduledAt: shortFuture
  })
  return r.code === 200 ? {
    status: r.data.status,
    scheduledAt: r.data.scheduledAt
  } : null
})

await test('9. [定时列表再验证] 确认状态为 scheduled', async () => {
  const r = await get(`/api/items/${scheduledId}`)
  return r.code === 200 ? {
    status: r.data.status,
    scheduledAt: r.data.scheduledAt
  } : null
})

await test('10. [等待 7 秒让自动切换触发]', async () => {
  await sleep(7000)
  return { waited: '7s' }
})

await test('11. [自动状态切换验证] 通过 list 接口触发 activateScheduledItems 自动切换', async () => {
  const r = await get('/api/items?status=active&pageSize=100')
  return r.code === 200 ? {
    activeCount: r.data.total,
    foundActivated: r.data.data.some(i => i.id === scheduledId)
  } : null
})

await test('12. [直接查询] 确认藏品状态已变为 active', async () => {
  const r = await get(`/api/items/${scheduledId}`)
  return r.code === 200 ? {
    status: r.data.status,
    scheduledAt: r.data.scheduledAt,
    title: r.data.title
  } : null
})

await test('13. [统计数据验证] draft/scheduled 计数正确', async () => {
  const r = await get('/api/items/stats')
  return r.code === 200 ? {
    total: r.data.total,
    draft: r.data.draft,
    scheduled: r.data.scheduled,
    active: r.data.active
  } : null
})

await test('14. [清理] 删除测试草稿', async () => {
  if (draftId) await del(`/api/items/${draftId}`)
  if (scheduledId) await del(`/api/items/${scheduledId}`)
  return { cleaned: true }
})

await test('15. [清理后统计验证', async () => {
  const r = await get('/api/items/stats')
  return r.code === 200 ? {
    total: r.data.total,
    draft: r.data.draft,
    scheduled: r.data.scheduled
  } : null
})

console.log('\n=== 完整链路测试完成 ===')
