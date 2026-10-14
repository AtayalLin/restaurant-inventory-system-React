// 出餐／收貨動作：優先走後端端點，端點不存在時退回前端版本，兩條路結果要一致
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup'
import { completeSalesOrder, receivePurchaseOrder } from './orderActions'
import { db } from '../mocks/db'
import type { SalesOrder } from '../types'

const stockOf = (id: string) => db.ingredients.find(i => i.id === id)!.currentStock

function seedOrder(qty: number): SalesOrder {
  const order = {
    id: 'act-order', status: 'PREPARING', items: [{ productId: 'p001', quantity: qty, unitPrice: 180 }],
    subtotal: 0, taxAmount: 0, discount: 0, total: 0, channel: 'DINE_IN', note: '',
    createdAt: new Date().toISOString(), testBatchId: null,
  } as SalesOrder
  db.salesOrders.push(order)
  return order
}

/** 模擬 json-server：沒有動作端點，回一般的 404（不是 problem+json） */
function simulateJsonServer() {
  server.use(
    http.post('*/api/salesOrders/:id/complete', () => new HttpResponse('Not Found', { status: 404 })),
    http.post('*/api/purchaseOrders/:id/receive', () => new HttpResponse('Not Found', { status: 404 })),
  )
}

describe('completeSalesOrder', () => {
  it('呼叫後端端點一次完成扣庫存', async () => {
    const before = stockOf('i001')
    const result = await completeSalesOrder(seedOrder(1))
    expect(result.status).toBe('COMPLETED')
    expect(stockOf('i001')).toBe(before - 200)
  })

  it('庫存不足時，錯誤訊息使用後端回傳的中文說明', async () => {
    // 點 20 碗牛肉麵：牛腱、麵條、青江菜都不夠，訊息要一次列出全部不足的食材
    const before = stockOf('i001')
    await expect(completeSalesOrder(seedOrder(20))).rejects.toThrow('庫存不足，無法完成訂單：牛腱肉、麵條、青江菜')
    expect(stockOf('i001')).toBe(before) // 全部不扣
  })

  it('訂單不存在時是後端的 404（problem+json），不會誤退回前端版本', async () => {
    await expect(completeSalesOrder({ id: 'no-such-order' } as SalesOrder)).rejects.toThrow('找不到銷售訂單')
  })

  it('json-server 沒有端點時，自動改用前端版本完成', async () => {
    simulateJsonServer()
    const before = stockOf('i001')
    const result = await completeSalesOrder(seedOrder(1))
    expect(result.status).toBe('COMPLETED')
    expect(stockOf('i001')).toBe(before - 200)
  })
})

describe('receivePurchaseOrder', () => {
  // 種子資料 po-0003：已下單，青江菜 3000g＋鮮奶 6000ml
  it('後端端點：增加庫存並改為已收貨', async () => {
    const before = stockOf('i006')
    const result = await receivePurchaseOrder(db.purchaseOrders.find(o => o.id === 'po-0003')!)
    expect(result.status).toBe('RECEIVED')
    expect(stockOf('i006')).toBe(before + 3000)
  })

  it('json-server 退回前端版本，結果相同', async () => {
    simulateJsonServer()
    const before = stockOf('i009')
    const result = await receivePurchaseOrder(db.purchaseOrders.find(o => o.id === 'po-0003')!)
    expect(result.status).toBe('RECEIVED')
    expect(stockOf('i009')).toBe(before + 6000)
  })
})
