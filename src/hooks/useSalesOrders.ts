import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// 關聯：src/pages/sales/SalesPage.tsx、SalesFormModal.tsx

import type { SalesOrder } from '../types'
// 【修正 Bug 3】移除未使用的 Product、Ingredient 型別匯入
// （這兩個型別的實際運算邏輯已搬到 salesOperations.ts，這裡不再需要）

import { fetchJSON } from '../lib/fetchJSON'
// 【修正 Bug 3】移除未使用的 patchSequentially 匯入
// （批次寫入庫存的邏輯已搬到 stockOperations.ts / salesOperations.ts）

import { completeSalesOrderCore } from '../lib/salesOperations'
// 【修正 Bug 3】移除未使用的 applyStockChangeWithLock 匯入
// （這支函式現在只在 salesOperations.ts / usePurchaseOrders.ts 內部被呼叫）

const BASE = '/api'

// ── fetch helper：處理 304 問題 + 自動重試 ────────────────── 因為考慮到可維護性，fetchJSON 已經搬到 src/lib/fetchJSON.ts，這裡不再重複定義，做為參考資料備註於此。
// 為什麼加 retry：json-server 在短時間內收到大量併發寫入請求時
//   偶爾會出現連線被拒（ERR_CONNECTION_REFUSED）或暫時無回應
//   加上重試機制，前端能自動恢復，不會直接整片紅字噴錯
// async function fetchJSON<T>(url: string, options?: RequestInit, retries = 2): Promise<T> {
//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       const res = await fetch(url, {
//         ...options,
//         headers: {
//           'Cache-Control': 'no-cache',
//           'Pragma': 'no-cache',
//           ...(options?.headers ?? {}),
//         },
//       })
//       if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
//       return res.json()
//     } catch (err) {
//       if (attempt === retries) throw err
//       await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
//     }
//   }
//   throw new Error('無法連線到伺服器')
// }

// ── 序列寫入 helper：取代 Promise.all 並行寫入 ──────────────
// 為什麼需要：json-server 用單一 db.json 檔案做持久化
//   多筆 PATCH 同時併發寫入容易造成寫入衝突或讓伺服器瞬間過載當機
// async function patchSequentially(
//   updates: { url: string; body: Record<string, unknown> }[]
// ): Promise<void> {
//   for (const { url, body } of updates) {
//     await fetchJSON(url, {
//       method: 'PATCH',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(body),
//     })
//   }
// }

// ── 稅額計算工具函式 ──────────────────────────────────────
export function calcTax(subtotal: number, taxRate = 5): number {
  return Math.floor(subtotal * taxRate / 100)
}

export function calcTotal(subtotal: number, taxAmount: number, discount = 0): number {
  return Math.round(subtotal + taxAmount - discount)
}

// ==========================================
// 銷售單（SalesOrder）
// ==========================================

export function useSalesOrders(options?: { refetchInterval?: number; refetchOnWindowFocus?: boolean }) {
  return useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: () => fetchJSON<SalesOrder[]>(`${BASE}/salesOrders`),
    retry: false,
    ...options,
  })
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<SalesOrder, 'id' | 'createdAt'>) => {
      return fetchJSON<SalesOrder>(`${BASE}/salesOrders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
    },
  })
}

export function useUpdateSalesStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalesOrder['status'] }) => {
      return fetchJSON<SalesOrder>(`${BASE}/salesOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
    },
  })
}

export function useCompleteSalesOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: SalesOrder) => completeSalesOrderCore(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] })
    },
  })
}

export function useRefundSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchJSON<SalesOrder>(`${BASE}/salesOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
    },
  })
}