import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// 關聯：src/pages/sales/SalesPage.tsx、SalesFormModal.tsx

import type { SalesOrder, Product, Ingredient } from '../types'
// SalesOrder：{ id, status, items: SalesItem[], subtotal, taxAmount, discount, total, channel, note, createdAt }
// SalesItem：{ productId, quantity, unitPrice }
// Product：需要 recipe 欄位計算食材消耗
// Ingredient：需要 currentStock 計算扣減後庫存

import { fetchJSON, patchSequentially } from '../lib/fetchJSON' // 新增


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
//       // 指數退避：第一次重試等 300ms，第二次等 600ms
//       // 為什麼要等待：給 json-server 一點喘息時間恢復，立即重試很可能再次失敗
//       await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
//     }
//   }
//   throw new Error('無法連線到伺服器')
// }

// ── 序列寫入 helper：取代 Promise.all 並行寫入 ────────────── 
// 這裡比較特別，因為 useCompleteSalesOrder 需要一次更新多筆食材庫存，原本用 Promise.all 併發寫入，json-server 在短時間內收到大量 PATCH 請求時容易當機。
// 改成 for...of 依序寫入，犧牲一點速度，換取穩定性。
// 為什麼需要：json-server 用單一 db.json 檔案做持久化
//   多筆 PATCH 同時併發寫入容易造成寫入衝突或讓伺服器瞬間過載當機
//   改用 for...of 依序執行，每筆都等前一筆完成才送下一筆
//   犧牲一點速度（多筆食材會花更久時間），換取穩定性
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

// 【本次修正】加上 retry: false：
//   fetchJSON 內部已經有自己的重試機制（重試 2 次 + 指數退避）。
//   TanStack Query 的 useQuery 預設本身也會重試 3 次，兩層疊加會讓
//   Dashboard 的 isError 判斷（見 useDashboard.ts）要等 10 秒以上才觸發，
//   使用者體感像卡住而非出錯。這裡讓 fetchJSON 專心重試，
//   useQuery 改成失敗一次就直接回報，不再重試一次。
export function useSalesOrders(options?: { refetchInterval?: number; refetchOnWindowFocus?: boolean }) {
  return useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: () => fetchJSON<SalesOrder[]>(`${BASE}/salesOrders`),
    retry: false,
    ...options,
  })
}

// 新增銷售單（點餐）
// 【本次未修改】useMutation 維持原樣：
//   TanStack Query 的 useMutation 預設不會自動重試，跟 useQuery 不同，
//   加上這裡是「建立訂單」這種有副作用的操作，重試可能造成重複下單，
//   不應該額外加 retry。
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

// 更新銷售單狀態（PENDING → PREPARING 或 → CANCELLED）
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

// 完成訂單：PREPARING → COMPLETED + 扣減食材庫存
export function useCompleteSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: SalesOrder) => {
      // ── 第一步：取得訂單內所有商品的 recipe（讀取可以並行，風險低）──
      const products = await Promise.all(
        order.items.map(item =>
          fetchJSON<Product>(`${BASE}/products/${item.productId}`)
        )
      )

      // ── 第二步：彙總食材消耗量 ────────────────────────────
      const consumptionMap = new Map<string, number>()

      products.forEach((product, idx) => {
        const salesQty = order.items[idx].quantity

        product.recipe.forEach(recipeItem => {
          const consume = recipeItem.quantity * salesQty
          const current = consumptionMap.get(recipeItem.ingredientId) ?? 0
          consumptionMap.set(recipeItem.ingredientId, current + consume)
        })
      })

      // ── 第三步：取得食材目前庫存（讀取，可並行）─────────────
      const ingredientIds = Array.from(consumptionMap.keys())
      const ingredients = await Promise.all(
        ingredientIds.map(id => fetchJSON<Ingredient>(`${BASE}/ingredients/${id}`))
      )

      // ── 第四步：序列更新每筆食材庫存（改為依序寫入，避免併發衝突）──
      const updates = ingredients.map(ingredient => {
        const consume = consumptionMap.get(ingredient.id) ?? 0
        const newStock = Math.max(0, ingredient.currentStock - consume)
        return {
          url: `${BASE}/ingredients/${ingredient.id}`,
          body: { currentStock: newStock },
        }
      })
      await patchSequentially(updates)
      // 為什麼這裡是關鍵修正點：
      //   訂單品項越多 → 涉及食材越多 → 原本 Promise.all 併發寫入量越大
      //   「大訂單」正是觸發 json-server 崩潰的典型情境，序列寫入直接解決根因

      // ── 第五步：更新銷售單狀態為 COMPLETED ───────────────
      return fetchJSON<SalesOrder>(`${BASE}/salesOrders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// 退款（COMPLETED → REFUNDED）
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