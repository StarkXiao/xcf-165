const BASE = 'http://localhost:3001'
let authToken = null

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

function getHeaders(auth = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

async function get(url, auth = true) {
  const r = await fetch(BASE + url, { headers: getHeaders(auth) })
  return r.json()
}

async function post(url, body, auth = true) {
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: getHeaders(auth),
    body: body ? JSON.stringify(body) : undefined
  })
  return r.json()
}

async function del(url, auth = true) {
  const r = await fetch(BASE + url, { method: 'DELETE', headers: getHeaders(auth) })
  return r.json()
}

console.log('=== 开始订单交易模块接口测试 ===\n')

const testUsername = 'test_order_user_' + Date.now()

await test('0. 注册测试用户', async () => {
  const r = await post('/api/users/register', {
    username: testUsername,
    password: 'test123456',
    nickname: '订单测试用户'
  }, false)
  return r.code === 201 ? { id: r.data.id, username: r.data.username } : r.message
})

await test('0.1 登录获取Token', async () => {
  const r = await post('/api/users/login', {
    username: testUsername,
    password: 'test123456'
  }, false)
  if (r.code === 200) {
    authToken = r.data.token
    return { token: authToken.slice(0, 20) + '...' }
  }
  return r.message
})

let testItemId = null
await test('1. 创建测试藏品', async () => {
  const r = await post('/api/items', {
    title: '订单测试藏品',
    description: '用于测试订单功能',
    story: '测试故事...',
    price: 100,
    imageUrl: 'https://picsum.photos/seed/order/600/400',
    emotionTags: '成长',
    category: '其他',
    condition: '全新'
  })
  testItemId = r.data?.id
  return r.code === 201 ? {
    id: testItemId?.slice(0, 8) + '...',
    title: r.data.title,
    price: r.data.price,
    status: r.data.status
  } : r.message
})

let testOrderId = null
if (testItemId) {
  await test('2. 下单 - 创建订单', async () => {
    const r = await post('/api/orders', {
      itemId: testItemId,
      buyerName: '测试买家',
      buyerPhone: '13800138000',
      buyerAddress: '测试地址',
      remark: '测试备注'
    })
    testOrderId = r.data?.id
    return r.code === 201 ? {
      id: testOrderId?.slice(0, 8) + '...',
      itemTitle: r.data.itemTitle,
      price: r.data.price,
      status: r.data.status,
      buyerName: r.data.buyerName
    } : r.message
  })

  if (testOrderId) {
    await test('3. 查询订单详情', async () => {
      const r = await get(`/api/orders/${testOrderId}`)
      return r.code === 200 ? {
        id: r.data.id.slice(0, 8) + '...',
        status: r.data.status,
        price: r.data.price
      } : r.message
    })

    await test('4. 确认订单 (pending → confirmed)', async () => {
      const r = await post(`/api/orders/${testOrderId}/confirm`)
      return r.code === 200 ? { status: r.data.status, confirmedAt: !!r.data.confirmedAt } : r.message
    })

    await test('5. 标记已付款 (confirmed → paid)', async () => {
      const r = await post(`/api/orders/${testOrderId}/paid`)
      return r.code === 200 ? { status: r.data.status, paidAt: !!r.data.paidAt } : r.message
    })

    await test('6. 标记已发货 (paid → shipped)', async () => {
      const r = await post(`/api/orders/${testOrderId}/shipped`)
      return r.code === 200 ? { status: r.data.status, shippedAt: !!r.data.shippedAt } : r.message
    })

    await test('7. 完成订单 (shipped → completed)', async () => {
      const r = await post(`/api/orders/${testOrderId}/complete`)
      return r.code === 200 ? { status: r.data.status, completedAt: !!r.data.completedAt } : r.message
    })

    await test('7.1 测试非法状态流转 (completed → shipped 应失败)', async () => {
      const r = await post(`/api/orders/${testOrderId}/shipped`)
      return r.code === 400 ? r.message : 'unexpected success'
    })
  }

  let testOrderId2 = null
  await test('8. 创建第二个订单测试取消流程', async () => {
    const r = await post('/api/orders', {
      itemId: testItemId,
      buyerName: '测试买家2'
    })
    testOrderId2 = r.data?.id
    return r.code === 201 ? { id: testOrderId2?.slice(0, 8) + '...', status: r.data.status } : r.message
  })

  if (testOrderId2) {
    await test('9. 取消待确认订单 (pending → cancelled)', async () => {
      const r = await post(`/api/orders/${testOrderId2}/cancel`)
      return r.code === 200 ? { status: r.data.status, cancelledAt: !!r.data.cancelledAt } : r.message
    })
  }

  let testOrderId3 = null
  await test('10. 创建第三个订单 (确认后取消)', async () => {
    const r = await post('/api/orders', {
      itemId: testItemId,
      buyerName: '测试买家3'
    })
    testOrderId3 = r.data?.id
    if (r.code !== 201) return r.message
    const r2 = await post(`/api/orders/${testOrderId3}/confirm`)
    return r2.code === 200 ? { id: testOrderId3?.slice(0, 8) + '...', status: r2.data.status } : r2.message
  })

  if (testOrderId3) {
    await test('11. 取消已确认订单 (confirmed → cancelled)', async () => {
      const r = await post(`/api/orders/${testOrderId3}/cancel`)
      return r.code === 200 ? { status: r.data.status } : r.message
    })
  }

  await test('12. 获取订单统计数据', async () => {
    const r = await get('/api/orders/stats')
    return r.code === 200 ? {
      total: r.data.total,
      pending: r.data.pending,
      completed: r.data.completed,
      cancelled: r.data.cancelled,
      totalAmount: r.data.totalAmount
    } : r.message
  })

  await test('13. 获取订单列表', async () => {
    const r = await get('/api/orders')
    return r.code === 200 ? {
      total: r.data.total,
      count: r.data.data.length,
      pages: r.data.totalPages
    } : r.message
  })

  await test('14. 按状态筛选订单', async () => {
    const r = await get('/api/orders?status=completed')
    return r.code === 200 ? {
      count: r.data.data.length,
      allCompleted: r.data.data.every(o => o.status === 'completed')
    } : r.message
  })

  await test('15. 清理测试藏品', async () => {
    const r = await del(`/api/items/${testItemId}`)
    return r.code === 200 ? 'deleted' : null
  })
}

console.log('\n=== 订单交易模块接口测试完成 ===')
