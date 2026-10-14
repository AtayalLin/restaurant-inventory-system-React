// 出餐扣庫存的整合測試：實際走一遍 API 呼叫流程（由 MSW 模擬後端）
import { describe, expect, it } from 'vitest'
import { completeSalesOrderCore } from './salesOperations'
import { applyStockChangeWithLock } from './stockOperations'
import { db } from '../mocks/db'
import type { SalesOrder } from '../types'

const stockOf = (id: string) => db.ingredients.find(i => i.id === id)!.currentStock

/** 建立一筆「準備中」的訂單放進模擬資料庫 */
function seedOrder(items: SalesOrder['items']): SalesOrder {
  const order: SalesOrder = {
    id: 'test-order', status: 'PREPARING', items,
    subtotal: 0, taxAmount: 0, discount: 0, total: 0,
    channel: 'DINE_IN', note: '', createdAt: new Date().toISOString(), testBatchId: null,
  }
  db.salesOrders.push(order)
  return order
}

describe('completeSalesOrderCore（出餐完成）', () => {
  it('依配方扣減食材庫存、寫入異動紀錄，並把訂單改成已完成', async () => {
    // 招牌牛肉麵 p001 配方：牛腱 200g、麵條 150g、青江菜 40g；點 2 碗
    const before = { beef: stockOf('i001'), noodle: stockOf('i002'), veg: stockOf('i006') }
    const order = seedOrder([{ productId: 'p001', quantity: 2, unitPrice: 180 }])

    const result = await completeSalesOrderCore(order)

    expect(result.status).toBe('COMPLETED')
    expect(stockOf('i001')).toBe(before.beef - 400)
    expect(stockOf('i002')).toBe(before.noodle - 300)
    expect(stockOf('i006')).toBe(before.veg - 80)
    // 每種食材一筆扣庫存紀錄，數量為負數
    const logs = db.stockLogs.filter(l => l.referenceId === order.id)
    expect(logs).toHaveLength(3)
    expect(logs.every(l => l.changeType === 'SALE_DEDUCT' && l.quantityChange < 0)).toBe(true)
  })

  it('同一食材出現在多個商品時會合併計算用量', async () => {
    // 雞腿飯 p004 用青江菜 50g、牛肉麵 p001 用 40g → 共 90g
    const before = stockOf('i006')
    const order = seedOrder([
      { productId: 'p004', quantity: 1, unitPrice: 120 },
      { productId: 'p001', quantity: 1, unitPrice: 180 },
    ])
    await completeSalesOrderCore(order)
    expect(stockOf('i006')).toBe(before - 90)
  })

  it('庫存不足時拋出錯誤，且所有食材庫存都不變', async () => {
    // 青江菜種子庫存 600g，燙青菜 p006 一份 150g，點 5 份需要 750g
    const before = stockOf('i006')
    const order = seedOrder([{ productId: 'p006', quantity: 5, unitPrice: 40 }])

    await expect(completeSalesOrderCore(order)).rejects.toThrow(/INSUFFICIENT_STOCK/)
    expect(stockOf('i006')).toBe(before)
    expect(db.salesOrders.find(o => o.id === order.id)!.status).toBe('PREPARING')
  })
})

describe('applyStockChangeWithLock（樂觀鎖庫存異動）', () => {
  it('採購收貨增加庫存，並把版本號加 1', async () => {
    const ing = db.ingredients.find(i => i.id === 'i003')!
    const { currentStock, version } = ing

    await applyStockChangeWithLock('i003', 1000, {
      changeType: 'PURCHASE_RECEIVE', referenceType: 'PURCHASE_ORDER', referenceId: 'po-test', testBatchId: null,
    })

    expect(ing.currentStock).toBe(currentStock + 1000)
    expect(ing.version).toBe(version + 1)
  })

  it('扣減後會變成負數時拒絕執行', async () => {
    const before = stockOf('i007')
    await expect(applyStockChangeWithLock('i007', -(before + 1), {
      changeType: 'SALE_DEDUCT', referenceType: 'SALES_ORDER', referenceId: 'x', testBatchId: null,
    })).rejects.toThrow(/INSUFFICIENT_STOCK/)
    expect(stockOf('i007')).toBe(before)
  })
})
