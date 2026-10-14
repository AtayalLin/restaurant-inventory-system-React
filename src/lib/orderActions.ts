/**
 * 出餐、收貨的「業務動作」：優先呼叫後端一次完成，舊環境自動退回前端逐步處理
 *
 * - Spring Boot 後端／線上 Demo（MSW）：POST /salesOrders/{id}/complete、/purchaseOrders/{id}/receive，
 *   由伺服器在同一筆交易內扣庫存、寫紀錄，中途失敗整筆還原。
 * - json-server（本機開發）：沒有這兩個端點會回 404，此時改用前端版本（completeSalesOrderCore 等），
 *   功能相同，只是交易一致性較弱。
 */
import { fetchJSON } from './fetchJSON'
import { applyStockChangeWithLock } from './stockOperations'
import { completeSalesOrderCore } from './salesOperations'
import { API_BASE } from './config'
import { apiFetch } from './auth'
import type { PurchaseOrder, SalesOrder } from '../types'

/** 呼叫後端動作端點；端點不存在（404／405 且不是後端的標準錯誤格式）時執行 fallback */
async function callAction<T>(url: string, fallback: () => Promise<T>): Promise<T> {
  const res = await apiFetch(url, { method: 'POST' })
  const isProblem = (res.headers.get('content-type') ?? '').includes('problem+json')

  // 後端回的 404 會是 problem+json（例如訂單不存在）；json-server 沒有此路由的 404 則不是
  if ((res.status === 404 || res.status === 405) && !isProblem) return fallback()

  if (res.status === 403) throw new Error('沒有權限執行這個操作')
  if (!res.ok) {
    // 後端錯誤格式（RFC 9457）：detail 是給使用者看的中文訊息，例如「庫存不足，無法完成訂單：麵條」
    const problem = isProblem ? await res.json().catch(() => null) as { detail?: string } | null : null
    throw new Error(problem?.detail ?? `API 錯誤：${res.status}`)
  }
  return res.json() as Promise<T>
}

/** 出餐完成：依配方扣庫存，訂單改為已完成 */
export function completeSalesOrder(order: SalesOrder): Promise<SalesOrder> {
  return callAction(`${API_BASE}/salesOrders/${order.id}/complete`, () => completeSalesOrderCore(order))
}

/** 前端版收貨（json-server 用）：逐項加庫存後更新採購單狀態 */
export async function receivePurchaseOrderCore(order: PurchaseOrder): Promise<PurchaseOrder> {
  for (const item of order.items) {
    await applyStockChangeWithLock(item.ingredientId, item.quantity, {
      changeType: 'PURCHASE_RECEIVE', referenceType: 'PURCHASE_ORDER', referenceId: order.id, testBatchId: null,
    })
  }
  return fetchJSON<PurchaseOrder>(`${API_BASE}/purchaseOrders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'RECEIVED', receivedDate: new Date().toISOString() }),
  })
}

/** 採購收貨：增加食材庫存，採購單改為已收貨 */
export function receivePurchaseOrder(order: PurchaseOrder): Promise<PurchaseOrder> {
  return callAction(`${API_BASE}/purchaseOrders/${order.id}/receive`, () => receivePurchaseOrderCore(order))
}
