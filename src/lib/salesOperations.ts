import { fetchJSON } from './fetchJSON'
import { applyStockChangeWithLock } from './stockOperations'
import type { SalesOrder, Product, Ingredient } from '../types'

const BASE = '/api'

// 從 useSalesOrders.ts 的 useCompleteSalesOrder 抽出來的核心邏輯
// 正式下單流程和併發測試，必須呼叫同一份程式碼
export async function completeSalesOrderCore(order: SalesOrder): Promise<SalesOrder> {
  const products = await Promise.all(
    order.items.map(item => fetchJSON<Product>(`${BASE}/products/${item.productId}`))
  )

  const consumptionMap = new Map<string, number>()
  products.forEach((product, idx) => {
    const salesQty = order.items[idx].quantity
    product.recipe.forEach(recipeItem => {
      const consume = recipeItem.quantity * salesQty
      const current = consumptionMap.get(recipeItem.ingredientId) ?? 0
      consumptionMap.set(recipeItem.ingredientId, current + consume)
    })
  })

  const ingredientIds = Array.from(consumptionMap.keys())
  const snapshot = await Promise.all(
    ingredientIds.map(id => fetchJSON<Ingredient>(`${BASE}/ingredients/${id}`))
  )
  const insufficient = snapshot.filter(ing => ing.currentStock < (consumptionMap.get(ing.id) ?? 0))
  if (insufficient.length > 0) {
    throw new Error(`INSUFFICIENT_STOCK: 庫存不足，無法完成訂單：${insufficient.map(i => i.name).join('、')}`)
  }

  for (const [ingredientId, consumeQty] of consumptionMap.entries()) {
    // 【修正 Bug 1 的連鎖】把 order.testBatchId 往下傳，stockLogs 才知道這筆是不是測試產生的
    await applyStockChangeWithLock(ingredientId, -consumeQty, {
      changeType: 'SALE_DEDUCT',
      referenceType: 'SALES_ORDER',
      referenceId: order.id,
      testBatchId: order.testBatchId, // 【新增】
    })
  }

  return fetchJSON<SalesOrder>(`${BASE}/salesOrders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  })
}