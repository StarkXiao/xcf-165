const BASE = 'http://localhost:3001'

async function test(name, fn) {
  try {
    const result = await fn()
    console.log(`✅ ${name}`, result ? JSON.stringify(result).slice(0, 200) : 'OK')
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

console.log('=== 开始竞价功能接口测试 ===\n')

await test('1. 获取统计数据(验证新字段)', async () => {
  const r = await get('/api/items/stats')
  return r.code === 200 ? {
    total: r.data.total,
    totalSoldAmount: r.data.totalSoldAmount,
    totalBidCount: r.data.totalBidCount,
    highestPrice: r.data.highestPrice
  } : null
})

let bidItemId = null
await test('2. 创建竞价测试藏品', async () => {
  const r = await post('/api/items', {
    title: '竞价测试藏品',
    description: '用于测试竞价功能',
    story: '测试故事...',
    price: 100,
    imageUrl: 'https://picsum.photos/seed/bid/600/400',
    emotionTags: '成长',
    category: '其他',
    condition: '全新'
  })
  bidItemId = r.data?.id
  return r.code === 201 ? {
    id: bidItemId?.slice(0, 8) + '...',
    currentPrice: r.data.currentPrice,
    bidCount: r.data.bidCount,
    soldPrice: r.data.soldPrice
  } : null
})

if (bidItemId) {
  await test('3. 首次出价', async () => {
    const r = await post(`/api/items/${bidItemId}/bids`, { bidder: '测试用户A', amount: 101 })
    return r.code === 201 ? { bidder: r.data.bidder, amount: r.data.amount } : r.message
  })

  await test('4. 低于最高价出价（应失败）', async () => {
    const r = await post(`/api/items/${bidItemId}/bids`, { bidder: '测试用户B', amount: 50 })
    return r.code === 400 ? r.message : 'unexpected success'
  })

  await test('5. 第二次更高出价', async () => {
    const r = await post(`/api/items/${bidItemId}/bids`, { bidder: '测试用户B', amount: 200 })
    return r.code === 201 ? { bidder: r.data.bidder, amount: r.data.amount } : r.message
  })

  await test('6. 获取出价记录', async () => {
    const r = await get(`/api/items/${bidItemId}/bids`)
    return r.code === 200 ? { count: r.data.length, topBid: r.data[0]?.amount, topBidder: r.data[0]?.bidder } : null
  })

  await test('7. 验证藏品 currentPrice 和 bidCount 已更新', async () => {
    const r = await get(`/api/items/${bidItemId}`)
    return r.code === 200 ? { currentPrice: r.data.currentPrice, bidCount: r.data.bidCount } : null
  })

  await test('8. 标记为成交', async () => {
    const r = await post(`/api/items/${bidItemId}/sold`)
    return r.code === 200 ? { status: r.data.status, soldPrice: r.data.soldPrice } : null
  })

  await test('9. 成交后再出价（应失败）', async () => {
    const r = await post(`/api/items/${bidItemId}/bids`, { bidder: '测试用户C', amount: 500 })
    return r.code === 400 ? r.message : 'unexpected success'
  })

  await test('10. 清理竞价测试藏品', async () => {
    const r = await del(`/api/items/${bidItemId}`)
    return r.code === 200 ? 'deleted' : null
  })
}

console.log('\n=== 竞价功能接口测试完成 ===')
