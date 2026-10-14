import { describe, expect, it } from 'vitest'
import { forecastProducts, forecastTomorrow, planIngredients } from './forecast'
import type { Ingredient, Product, SalesOrder } from '../types'

// 最小測試資料：一個商品（滷肉飯：豬肉 60g、白米 150g）
const products = [
  { id: 'p1', name: '滷肉飯', isActive: true, recipe: [{ ingredientId: 'pork', quantity: 60 }, { ingredientId: 'rice', quantity: 150 }] },
  { id: 'p2', name: '已下架', isActive: false, recipe: [] },
] as unknown as Product[]
const ingredients = [
  { id: 'pork', name: '豬五花', unit: 'g', currentStock: 1000, safetyStock: 500 },
  { id: 'rice', name: '白米', unit: 'g', currentStock: 10000, safetyStock: 2000 },
] as Ingredient[]

let seq = 0
function order(date: string, qty: number, status: SalesOrder['status'] = 'COMPLETED', productId = 'p1'): SalesOrder {
  return { id: String(seq++), status, items: [{ productId, quantity: qty, unitPrice: 45 }], createdAt: new Date(date).toISOString() } as SalesOrder
}

// 預測目標：2026-10-15（星期四）→ 參考 10/8、10/1、9/24、9/17 四個星期四
const target = new Date('2026-10-15T12:00:00')

describe('forecastProducts（同星期平均）', () => {
  it('只取過去 4 個同星期的已完成訂單平均', () => {
    const orders = [
      order('2026-10-08T12:00:00', 10), order('2026-10-01T12:00:00', 20),
      order('2026-09-24T12:00:00', 30), order('2026-09-17T12:00:00', 40),
      order('2026-10-09T12:00:00', 999),             // 星期五，不算
      order('2026-09-10T12:00:00', 999),             // 第 5 週前，不算
      order('2026-10-08T13:00:00', 999, 'REFUNDED'), // 退款，不算
    ]
    const { products: result, weeksUsed } = forecastProducts(orders, products, target)
    expect(weeksUsed).toBe(4)
    expect(result).toEqual([{ productId: 'p1', name: '滷肉飯', quantity: 25 }])
  })

  it('新店資料不足 4 週時，以實際有資料的週數平均', () => {
    const { products: result, weeksUsed } = forecastProducts([order('2026-10-08T12:00:00', 9)], products, target)
    expect(weeksUsed).toBe(1)
    expect(result[0].quantity).toBe(9)
  })

  it('沒有任何歷史資料時回傳空結果', () => {
    expect(forecastProducts([], products, target)).toEqual({ products: [], weeksUsed: 0 })
  })

  it('已下架商品不列入預測', () => {
    const { products: result } = forecastProducts([order('2026-10-08T12:00:00', 5, 'COMPLETED', 'p2')], products, target)
    expect(result).toEqual([])
  })
})

describe('planIngredients（叫貨建議）', () => {
  it('依配方換算用量，並建議補到營業後仍有安全庫存', () => {
    // 預估 25 份：豬肉 1500g、白米 3750g
    const plan = planIngredients([{ productId: 'p1', name: '滷肉飯', quantity: 25 }], products, ingredients)
    const pork = plan.find(p => p.ingredientId === 'pork')!
    expect(pork.usage).toBe(1500)
    expect(pork.projectedStock).toBe(-500)
    expect(pork.orderQty).toBe(1000) // 500 安全庫存 − (−500) = 1000

    const rice = plan.find(p => p.ingredientId === 'rice')!
    expect(rice.projectedStock).toBe(6250)
    expect(rice.orderQty).toBe(0) // 庫存充足不需叫貨
    expect(plan[0].ingredientId).toBe('pork') // 需叫貨的排前面
  })

  it('g／ml 叫貨量以 100 為單位無條件進位', () => {
    const plan = planIngredients([{ productId: 'p1', name: '滷肉飯', quantity: 9.1 }], products, ingredients)
    // 豬肉用量 546g → 剩 454g，需補 46g → 進位為 100g
    expect(plan.find(p => p.ingredientId === 'pork')!.orderQty).toBe(100)
  })
})

describe('forecastTomorrow', () => {
  it('以 now 的隔天為預測目標', () => {
    const r = forecastTomorrow([order('2026-10-08T12:00:00', 4)], products, ingredients, new Date('2026-10-14T20:00:00'))
    expect(r.targetDate.getDate()).toBe(15)
    expect(r.products[0].quantity).toBe(4)
  })
})
