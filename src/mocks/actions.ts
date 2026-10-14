/**
 * Demo 版的業務動作端點：規則與 Spring Boot 的 InventoryService 相同
 * 先檢查全部、再一次寫入，所以不會「扣了一半」；錯誤用和後端一樣的 Problem Details 格式回傳
 */
import { db, persist } from './db'
import type { PurchaseOrder, SalesOrder, StockLog } from '../types'

export class ActionError extends Error {
  readonly status: number
  readonly title: string
  // 專案啟用 erasableSyntaxOnly，不能用 constructor 參數屬性簡寫，改為明確宣告欄位
  constructor(status: number, title: string, message: string) {
    super(message)
    this.status = status
    this.title = title
  }
}

function addLog(log: Omit<StockLog, 'id' | 'createdAt'>) {
  db.stockLogs.push({ ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
}

export function completeSalesOrder(id: string): SalesOrder {
  const order = db.salesOrders.find(o => o.id === id)
  if (!order) throw new ActionError(404, 'NOT_FOUND', `找不到銷售訂單：${id}`)
  if (order.status !== 'PREPARING') throw new ActionError(409, 'INVALID_STATUS', `只有「準備中」的訂單可以出餐，目前狀態：${order.status}`)

  // 依配方合併計算食材用量
  const usage = new Map<string, number>()
  for (const item of order.items) {
    const product = db.products.find(p => p.id === item.productId)
    if (!product) throw new ActionError(422, 'PRODUCT_NOT_FOUND', `訂單中的商品不存在：${item.productId}`)
    for (const r of product.recipe) usage.set(r.ingredientId, (usage.get(r.ingredientId) ?? 0) + r.quantity * item.quantity)
  }

  const targets = db.ingredients.filter(i => usage.has(i.id))
  const insufficient = targets.filter(i => i.currentStock < usage.get(i.id)!).map(i => i.name)
  if (insufficient.length > 0) throw new ActionError(422, 'INSUFFICIENT_STOCK', `庫存不足，無法完成訂單：${insufficient.join('、')}`)

  for (const ing of targets) {
    const change = -usage.get(ing.id)!
    ing.currentStock += change
    ing.version = (ing.version ?? 0) + 1
    addLog({ ingredientId: ing.id, changeType: 'SALE_DEDUCT', quantityChange: change, resultingStock: ing.currentStock,
      referenceType: 'SALES_ORDER', referenceId: order.id, testBatchId: order.testBatchId })
  }
  order.status = 'COMPLETED'
  persist()
  return order
}

export function receivePurchaseOrder(id: string): PurchaseOrder {
  const order = db.purchaseOrders.find(o => o.id === id)
  if (!order) throw new ActionError(404, 'NOT_FOUND', `找不到採購單：${id}`)
  if (order.status !== 'ORDERED') throw new ActionError(409, 'INVALID_STATUS', `只有「已下單」的採購單可以收貨，目前狀態：${order.status}`)

  const missing = order.items.find(it => !db.ingredients.some(i => i.id === it.ingredientId))
  if (missing) throw new ActionError(422, 'INGREDIENT_NOT_FOUND', `採購單中的食材不存在：${missing.ingredientId}`)

  for (const item of order.items) {
    const ing = db.ingredients.find(i => i.id === item.ingredientId)!
    ing.currentStock += item.quantity
    ing.version = (ing.version ?? 0) + 1
    addLog({ ingredientId: ing.id, changeType: 'PURCHASE_RECEIVE', quantityChange: item.quantity, resultingStock: ing.currentStock,
      referenceType: 'PURCHASE_ORDER', referenceId: order.id, testBatchId: null })
  }
  order.status = 'RECEIVED'
  order.receivedDate = new Date().toISOString()
  persist()
  return order
}
