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

async function createOrder(token, itemId, buyerName = '测试买家') {
  const r = await fetch(BASE + '/api/orders', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ itemId, buyerName, buyerPhone: '13800138000', buyerAddress: '测试地址' })
  })
  return r.json()
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

console.log('=== 订单权限与状态流转严格校验测试 ===\n')

// 卖家
const sellerUsername = 'seller_' + Date.now()
const sellerReg = await userRegister(sellerUsername)
const sellerToken = (await userLogin(sellerUsername)).data?.token
console.log('卖家登录:', sellerToken ? '成功' : '失败')

// 买家
const buyerUsername = 'buyer_' + Date.now()
await userRegister(buyerUsername)
const buyerToken = (await userLogin(buyerUsername)).data?.token
console.log('买家登录:', buyerToken ? '成功' : '失败')

// 第三方 (不是买家也不是卖家)
const thirdUsername = 'third_' + Date.now()
await userRegister(thirdUsername)
const thirdToken = (await userLogin(thirdUsername)).data?.token
console.log('第三方登录:', thirdToken ? '成功' : '失败\n')

// 1. 测试下单条件收紧
let soldItemId = null
await test('1.1 已成交(sold)藏品无法下单', async () => {
  const r = await createItem(sellerToken, '已成交藏品', 100, 'sold')
  soldItemId = r.data?.id
  if (!soldItemId) return '创建藏品失败'
  const order = await createOrder(buyerToken, soldItemId)
  return order.code !== 201 ? order.message : 'unexpected success'
})

let archivedItemId = null
await test('1.2 已下架(archived)藏品无法下单', async () => {
  const r = await createItem(sellerToken, '已下架藏品', 100, 'archived')
  archivedItemId = r.data?.id
  if (!archivedItemId) return '创建藏品失败'
  const order = await createOrder(buyerToken, archivedItemId)
  return order.code !== 201 ? order.message : 'unexpected success'
})

let draftItemId = null
await test('1.3 草稿(draft)藏品无法下单', async () => {
  const r = await createItem(sellerToken, '草稿藏品', 100, 'draft')
  draftItemId = r.data?.id
  if (!draftItemId) return '创建藏品失败'
  const order = await createOrder(buyerToken, draftItemId)
  return order.code !== 201 ? order.message : 'unexpected success'
})

// 2. 创建一个正常订单用于权限测试
let activeItem = await createItem(sellerToken, '权限测试藏品', 200, 'active')
let activeItemId = activeItem.data?.id
let testOrderId = null

await test('2.1 active藏品下单成功', async () => {
  const r = await createOrder(buyerToken, activeItemId)
  testOrderId = r.data?.id
  return r.code === 201 ? {
    id: testOrderId?.slice(0, 8) + '...',
    sellerId: r.data.sellerId?.slice(0, 8) + '...',
    buyerId: r.data.buyerId?.slice(0, 8) + '...',
    status: r.data.status
  } : r.message
})

// 3. 权限测试：confirm (pending→confirmed)，仅卖家
await test('3.1 买家不能确认订单', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/confirm`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('3.2 第三方不能确认订单', async () => {
  const r = await post(thirdToken, `/api/orders/${testOrderId}/confirm`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('3.3 卖家可以确认订单', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/confirm`)
  return r.code === 200 ? { status: r.data.status, confirmedAt: !!r.data.confirmedAt } : r.message
})

// 4. 权限测试：markPaid (confirmed→paid)，仅买家
await test('4.1 卖家不能标记已付款', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/paid`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('4.2 第三方不能标记已付款', async () => {
  const r = await post(thirdToken, `/api/orders/${testOrderId}/paid`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('4.3 买家可以标记已付款', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/paid`)
  return r.code === 200 ? { status: r.data.status, paidAt: !!r.data.paidAt } : r.message
})

// 5. 权限测试：markShipped (paid→shipped)，仅卖家
await test('5.1 买家不能标记已发货', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/shipped`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('5.2 卖家可以标记已发货', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/shipped`)
  return r.code === 200 ? { status: r.data.status, shippedAt: !!r.data.shippedAt } : r.message
})

// 6. 权限测试：complete (shipped→completed)，仅买家
await test('6.1 卖家不能完成订单', async () => {
  const r = await post(sellerToken, `/api/orders/${testOrderId}/complete`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('6.2 买家可以完成订单', async () => {
  const r = await post(buyerToken, `/api/orders/${testOrderId}/complete`)
  return r.code === 200 ? { status: r.data.status, completedAt: !!r.data.completedAt } : r.message
})

// 7. 测试取消权限（买家卖家都能取消pending/confirmed）
let cancelOrderId1 = null
await test('7.1 创建待取消订单1', async () => {
  const r = await createOrder(buyerToken, activeItemId)
  cancelOrderId1 = r.data?.id
  return r.code === 201 ? { id: cancelOrderId1?.slice(0, 8) + '...', status: r.data.status } : r.message
})

await test('7.2 卖家可以取消pending订单', async () => {
  const r = await post(sellerToken, `/api/orders/${cancelOrderId1}/cancel`)
  return r.code === 200 ? { status: r.data.status, cancelledAt: !!r.data.cancelledAt } : r.message
})

let cancelOrderId2 = null
await test('7.3 创建待取消订单2', async () => {
  const r = await createOrder(buyerToken, activeItemId)
  cancelOrderId2 = r.data?.id
  return r.code === 201 ? { id: cancelOrderId2?.slice(0, 8) + '...', status: r.data.status } : r.message
})

await test('7.4 买家可以取消pending订单', async () => {
  const r = await post(buyerToken, `/api/orders/${cancelOrderId2}/cancel`)
  return r.code === 200 ? { status: r.data.status } : r.message
})

let cancelOrderId3 = null
await test('7.5 创建待取消订单3 (已paid状态, 仅卖家可取消)', async () => {
  const createR = await createOrder(buyerToken, activeItemId)
  cancelOrderId3 = createR.data?.id
  if (!cancelOrderId3) return '创建失败'
  await post(sellerToken, `/api/orders/${cancelOrderId3}/confirm`)
  await post(buyerToken, `/api/orders/${cancelOrderId3}/paid`)
  const detail = await get(buyerToken, `/api/orders/${cancelOrderId3}`)
  return { id: cancelOrderId3.slice(0, 8) + '...', status: detail.data.status }
})

await test('7.6 买家不能取消paid状态订单', async () => {
  const r = await post(buyerToken, `/api/orders/${cancelOrderId3}/cancel`)
  return r.code === 400 ? r.message : 'unexpected: ' + JSON.stringify(r)
})

await test('7.7 卖家可以取消paid状态订单', async () => {
  const r = await post(sellerToken, `/api/orders/${cancelOrderId3}/cancel`)
  return r.code === 200 ? { status: r.data.status } : r.message
})

// 8. 统计与查询的角色隔离
await test('8.1 卖家视角的订单统计', async () => {
  const r = await get(sellerToken, '/api/orders/stats?role=seller')
  return r.code === 200 ? {
    total: r.data.total,
    completed: r.data.completed,
    totalAmount: r.data.totalAmount
  } : r.message
})

await test('8.2 买家视角的订单统计', async () => {
  const r = await get(buyerToken, '/api/orders/stats?role=buyer')
  return r.code === 200 ? {
    total: r.data.total,
    completed: r.data.completed,
    cancelled: r.data.cancelled
  } : r.message
})

await test('8.3 第三方视角的统计(应该为0)', async () => {
  const r = await get(thirdToken, '/api/orders/stats')
  return r.code === 200 ? { total: r.data.total, allZero: r.data.total === 0 } : r.message
})

await test('8.4 卖家订单列表仅含卖家订单', async () => {
  const r = await get(sellerToken, '/api/orders?role=seller')
  const allSeller = r.data.data.every(o => o.sellerId === sellerReg.data.id)
  return r.code === 200 ? { count: r.data.data.length, allSellerOrders: allSeller } : r.message
})

await test('8.5 买家订单列表仅含买家订单', async () => {
  const buyerInfo = await userLogin(buyerUsername)
  const buyerId = buyerInfo.data.user.id
  const r = await get(buyerToken, '/api/orders?role=buyer')
  const allBuyer = r.data.data.every(o => o.buyerId === buyerId)
  return r.code === 200 ? { count: r.data.data.length, allBuyerOrders: allBuyer } : r.message
})

// 9. 订单详情权限隔离
await test('9.1 第三方无权查看他人订单详情', async () => {
  const r = await get(thirdToken, `/api/orders/${testOrderId}`)
  return r.code === 403 ? r.message : 'unexpected'
})

await test('9.2 买家可以查看自己的订单详情', async () => {
  const r = await get(buyerToken, `/api/orders/${testOrderId}`)
  return r.code === 200 ? { id: r.data.id.slice(0, 8) + '...', status: r.data.status } : r.message
})

await test('9.3 卖家可以查看自己的订单详情', async () => {
  const r = await get(sellerToken, `/api/orders/${testOrderId}`)
  return r.code === 200 ? { id: r.data.id.slice(0, 8) + '...', status: r.data.status } : r.message
})

console.log('\n=== 权限与隔离测试完成 ===')
