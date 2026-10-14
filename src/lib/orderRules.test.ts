import { describe, expect, it } from 'vitest'
import { applyMinOrder, checkPurchaseLines, draftsFromForecast, orderDayNotice } from './orderRules'
import type { Ingredient, Supplier } from '../types'
import type { IngredientPlan } from './forecast'

const ingredients = [
  { id: 'beef', name: '牛腱', unit: 'g', supplierId: 's1', minOrderQty: 1000, costPerUnit: 0.3 },
  { id: 'rice', name: '白米', unit: 'g', supplierId: 's2', minOrderQty: 0, costPerUnit: 0.05 },
  { id: 'salt', name: '鹽', unit: 'g', supplierId: null, costPerUnit: 0.01 },
] as Ingredient[]
const suppliers = [
  { id: 's1', name: '肉品行', orderDays: [1, 4] }, // 週一、週四
  { id: 's2', name: '乾貨行', orderDays: [] },     // 每天
] as unknown as Supplier[]

describe('applyMinOrder', () => {
  it('不足最低訂購量時補到最低量', () => {
    expect(applyMinOrder(300, 1000)).toBe(1000)
    expect(applyMinOrder(1500, 1000)).toBe(1500)
    expect(applyMinOrder(50)).toBe(50)
  })
})

describe('checkPurchaseLines', () => {
  it('低於最低訂購量時擋下數量欄位', () => {
    expect(checkPurchaseLines([{ ingredientId: 'beef', quantity: 500 }], ingredients, 's1'))
      .toEqual([{ index: 0, field: 'quantity', message: '低於最低訂購量 1,000 g' }])
  })

  it('食材不是這家供應商供應時擋下', () => {
    const issues = checkPurchaseLines([{ ingredientId: 'rice', quantity: 100 }], ingredients, 's1')
    expect(issues[0]).toMatchObject({ field: 'ingredientId', message: '這項食材不是由此供應商供應' })
  })

  it('同一食材重複時擋下第二列', () => {
    const issues = checkPurchaseLines([{ ingredientId: 'beef', quantity: 1000 }, { ingredientId: 'beef', quantity: 1000 }], ingredients, 's1')
    expect(issues).toEqual([{ index: 1, field: 'ingredientId', message: '同一食材重複，請合併成一列' }])
  })

  it('沒有指定供應商的食材任何供應商都能叫；符合規則時沒有問題', () => {
    expect(checkPurchaseLines([{ ingredientId: 'salt', quantity: 1 }, { ingredientId: 'beef', quantity: 1000 }], ingredients, 's1')).toEqual([])
  })
})

describe('orderDayNotice', () => {
  it('非叫貨日時提醒，並算出下一個叫貨日', () => {
    const tuesday = new Date('2026-10-13T10:00:00') // 週二
    expect(orderDayNotice(suppliers[0], tuesday)).toContain('下次叫貨日是週四')
  })

  it('叫貨日當天、或每天都能叫貨的供應商不提醒', () => {
    expect(orderDayNotice(suppliers[0], new Date('2026-10-15T10:00:00'))).toBeNull() // 週四
    expect(orderDayNotice(suppliers[1], new Date('2026-10-13T10:00:00'))).toBeNull()
  })
})

describe('draftsFromForecast', () => {
  it('依供應商分組、補到最低訂購量、帶入單位成本，略過不需叫貨與沒有供應商的食材', () => {
    const plans = [
      { ingredientId: 'beef', orderQty: 300 },
      { ingredientId: 'rice', orderQty: 2000 },
      { ingredientId: 'salt', orderQty: 100 },
      { ingredientId: 'rice2', orderQty: 0 },
    ] as IngredientPlan[]
    expect(draftsFromForecast(plans, ingredients, suppliers)).toEqual([
      { supplierId: 's1', supplierName: '肉品行', items: [{ ingredientId: 'beef', quantity: 1000, unitPrice: 0.3 }] },
      { supplierId: 's2', supplierName: '乾貨行', items: [{ ingredientId: 'rice', quantity: 2000, unitPrice: 0.05 }] },
    ])
  })
})
