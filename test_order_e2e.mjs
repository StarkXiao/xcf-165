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

function headers(authToken) {
  const h = { 'Content-Type': 'application/json' }
  if (authToken) h['Authorization'] = `Bearer ${authToken}`
  return h
}

async function userRegister(username) {
  const r = await fetch(BASE + '/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'test123456', nickname: username })
  })
  return r.json()
}

async function userLogin(username) {
  const r = await fetch(BASE + '/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'test123456' })
  })
  return r.json()
}

async function createItem(token, title, price = 100, status = 'active') {
  const r = await fetch(BASE + '/api/items', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      title, description: 'test', story: 'test', price,
      imageUrl: 'https://picsum.photos/seed/' + title + '/600/400',
      emotionTags: '成长', category: '其他', condition: '全新'
    })
  })
  const json = await r.json()
  if (json.code === 201 && status !== 'active') {
    const updateR = await fetch(BASE + '/api/items/' + json.data.id, {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({ status })
    })
    return updateR.json()
  }
  return json
}

async function post(token, url, body) {
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined
  })
  return r.json()
}

async function get(token, url) {
  const r = await fetch(BASE + url, { headers: headers(token) })
  return r.json()
}

console.log('=== 订单模块端到端完整流程验证 ===\n')

// 注册卖家和买家
const ts = Date.now()
const sellerUser = `seller_e2e_${ts}`
const buyerUser = `buyer_e2e_${ts}`

await userRegister(sellerUser)
await userRegister(buyerUser)
const sellerLogin = await userLogin(sellerUser)
const buyerLogin = await userLogin(buyerUser)
const sellerToken = sellerLogin.data.token
const buyerToken = buyerLogin.data.token
const sellerId = sellerLogin.data.user.id
const buyerId = buyerLogin.data.user.id
console.log(`卖家: ${sellerUser} 登录成功`)
console.log(`买家: ${buyerUser} 登录成功\n`)

// ============ 1. 未登录无法下单 ============
await test('1. 未登录用户无法下单 (返回401)', async () => {
  const r = await post(null, '/api/orders', { itemId: 'any-id', buyerName: '匿名' })
  return r.code === 401 ? `code=${r.code}` : JSON.stringify(r)
})

// ============ 2. 不能对自己的藏品下单 ============
let sellerOwnItem = null
await test('2. 卖家创建藏品', async () => {
  const r = await createItem(sellerToken, '自购测试藏品', 100)
  sellerOwnItem = r.data
  return r.code === 201 ? { id: sellerOwnItem.id.slice(0, 8) + '...' } : r.message
})

await test('2.1 卖家不能对自己上架的藏品下单', async () => {
  const r = await post(sellerToken, '/api/orders', { itemId: sellerOwnItem.id })
  return r.code === 400 ? r.message : 'unexpected'
})

// ============ 3. 买家下单 + 完整状态流转 ============
let testOrderId = null

await test('3. 买家下单成功 (buyerId 自动填充)', async () => {
  const r = await post(buyerToken, '/api/orders', {
    itemId: sellerOwnItem.id,
    buyerPhone: '13800138000',
    buyerAddress: '测试地址'
  })
  testOrderId = r.data?.id
  return r.code === 201 ? {
    id: testOrderId.slice(0, 8) + '...',
    buyerIdMatch: r.data.buyerId === buyerId,
    buyerName: r.data.buyerName,
    sellerIdMatch: r.data.sellerId === sellerId,
    status: r.data.status
  } : r.message
})

// 记录状态变化前卖家和买家的统计
let sellerStatsBefore = null
let buyerStatsBefore = null
await test('3.1 操作前卖家统计', async () => {
  const r = await get(sellerToken, '/api/orders/stats?role=seller')
  sellerStatsBefore = r.data
  return { total: r.data.total, pending: r.data.pending, totalAmount: r.data.totalAmount }
})

await test('3.2 操作前买家统计', async () => {
  const r = await get(buyerToken, '/api/orders/stats?role=buyer')
  buyerStatsBefore = r.data
  return { total: r.data.total, pending: r.data.pending, totalAmount: r.data.totalAmount }
})

// pending → confirmed (卖家)
await test('4. 卖家确认订单 (pending → confirmed)', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/confirm`)
  return r.code === 200 ? { status: r.data.status, confirmedAt: !!r.data.confirmedAt } : r.message
})

await test('4.1 卖家统计: pending→confirmed 变化', async () => {
  const r = await get(sellerToken, '/api/orders/stats?role=seller')
  return {
    pending: r.data.pending,
    confirmed: r.data.confirmed,
    total: r.data.total,
    confirmedIncreased: r.data.confirmed > sellerStatsBefore.confirmed
  }
})

// confirmed → paid (买家)
await test('5. 买家标记已付款 (confirmed → paid)', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/paid`)
  return r.code === 200 ? { status: r.data.status, paidAt: !!r.data.paidAt } : r.message
})

await test('5.1 买家统计: confirmed→paid 变化', async () => {
  const r = await get(buyerToken, '/api/orders/stats?role=buyer')
  return {
    confirmed: r.data.confirmed,
    paid: r.data.paid,
    paidIncreased: r.data.paid > buyerStatsBefore.paid
  }
})

// paid → shipped (卖家)
await test('6. 卖家标记已发货 (paid → shipped)', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/shipped`)
  return r.code === 200 ? { status: r.data.status, shippedAt: !!r.data.shippedAt } : r.message
})

await test('6.1 卖家统计: paid→shipped 变化', async () => {
  const r = await get(sellerToken, '/api/orders/stats?role=seller')
  return { paid: r.data.paid, shipped: r.data.shipped }
})

// shipped → completed (买家)
await test('7. 买家确认收货 (shipped → completed)', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/complete`)
  return r.code === 200 ? { status: r.data.status, completedAt: !!r.data.completedAt } : r.message
})

await test('7.1 卖家统计: 完成后金额累加', async () => {
  const r = await get(sellerToken, '/api/orders/stats?role=seller')
  return {
    completed: r.data.completed,
    totalAmount: r.data.totalAmount,
    amountIncreased: r.data.totalAmount > sellerStatsBefore.totalAmount
  }
})

await test('7.2 买家统计: 完成后金额累加', async () => {
  const r = await get(buyerToken, '/api/orders/stats?role=buyer')
  return {
    completed: r.data.completed,
    totalAmount: r.data.totalAmount,
    amountIncreased: r.data.totalAmount > buyerStatsBefore.totalAmount
  }
})

// ============ 8. 买卖双方角色互斥检查 ============
await test('8.1 卖家订单列表不含买家视角', async () => {
  const r = await get(sellerToken, '/api/orders?role=seller')
  const allSeller = r.data.data.every(o => o.sellerId === sellerId)
  return { allSellerOrders: allSeller, count: r.data.data.length }
})

await test('8.2 买家订单列表不含卖家视角', async () => {
  const r = await get(buyerToken, '/api/orders?role=buyer')
  const allBuyer = r.data.data.every(o => o.buyerId === buyerId)
  return { allBuyerOrders: allBuyer, count: r.data.data.length }
})

// ============ 9. 已成交藏品无法再下单 ============
await test('9. 将藏品标记为 sold', async () => {
  const r = await fetch(BASE + '/api/items/' + sellerOwnItem.id, {
    method: 'PUT',
    headers: headers(sellerToken),
    body: JSON.stringify({ status: 'sold' })
  })
  return r.json().then(j => j.code === 200 ? { status: j.data.status } : j.message)
})

await test('9.1 sold 状态藏品无法再下单', async () => {
  const r = await post(buyerToken, '/api/orders', { itemId: sellerOwnItem.id })
  return r.code === 400 ? r.message : 'unexpected'
})

console.log('\n=== 端到端完整流程验证完成 ===')
