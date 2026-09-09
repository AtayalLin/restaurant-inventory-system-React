import { fetchJSON } from './fetchJSON'
import type { Ingredient, StockLog } from '../types'

const BASE = '/api'
const MAX_LOCK_RETRIES = 3

interface StockChangeMeta {
  changeType: StockLog['changeType']
  referenceType: StockLog['referenceType']
  referenceId: string
  testBatchId: string | null // 【新增】StockLog.testBatchId 已改為必填，這裡強制呼叫端明確傳入
}

// quantityChange：正數＝入庫（採購收貨），負數＝出庫（銷售扣減）
// 用同一支函式處理兩個方向，避免銷售／採購兩邊各自維護一份相似邏輯
//
// 【對應培訓題目一】先檢查庫存、後扣除數量 + 樂觀鎖重試
export async function applyStockChangeWithLock(
  ingredientId: string,
  quantityChange: number,
  meta: StockChangeMeta
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_LOCK_RETRIES; attempt++) {
    const ingredient = await fetchJSON<Ingredient>(`${BASE}/ingredients/${ingredientId}`)

    const newStock = ingredient.currentStock + quantityChange
    if (newStock < 0) {
      // 先檢查、後扣除：庫存不夠直接丟出錯誤，不做 Math.max(0, ...) 靜默夾住
      throw new Error(`INSUFFICIENT_STOCK: 庫存不足：${ingredient.name} 剩餘 ${ingredient.currentStock}，需要 ${-quantityChange}`)
    }

    const expectedVersion = ingredient.version ?? 0

    try {
      await fetchJSON(`${BASE}/ingredients/${ingredientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: newStock, version: expectedVersion + 1 }),
      })

      // 【樂觀鎖模擬】寫入後立刻重讀，確認版本如預期地變成 expectedVersion+1
      // 不符合代表寫入期間被其他請求插隊覆蓋，視為衝突並重試
      // 注意：這只是縮小競爭窗口，不是絕對安全；json-server 沒有條件式更新，
      // 真正的原子性保證需要搭配具備交易/鎖機制的正式資料庫
      const confirm = await fetchJSON<Ingredient>(`${BASE}/ingredients/${ingredientId}`)
      if (confirm.version !== expectedVersion + 1) continue // 衝突，重試

      // 【修正 Bug 1】補上必填欄位 testBatchId，否則型別檢查會報錯
      await fetchJSON(`${BASE}/stockLogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ingredientId,
          changeType: meta.changeType,
          quantityChange,
          resultingStock: newStock,
          referenceType: meta.referenceType,
          referenceId: meta.referenceId,
          testBatchId: meta.testBatchId, // 【新增】
          createdAt: new Date().toISOString(),
        } satisfies StockLog),
      })
      return // 成功
    } catch (err) {
      if (attempt === MAX_LOCK_RETRIES) throw err
    }
  }
  throw new Error(`庫存更新衝突次數過多，請稍後重試（ingredientId: ${ingredientId}）`)
}