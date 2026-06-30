import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// 關聯：src/pages/sales/SalesPage.tsx、SalesFormModal.tsx

import type { SalesOrder, Product, Ingredient } from '../types'
// SalesOrder：{ id, status, items: SalesItem[], subtotal, taxAmount, discount, total, channel, note, createdAt }
// SalesItem：{ productId, quantity, unitPrice }
// Product：需要 recipe 欄位計算食材消耗
// Ingredient：需要 currentStock 計算扣減後庫存

const BASE = '/api'

// ── fetch helper：處理 304 問題 + 自動重試 ──────────────────
// 為什麼加 retry：json-server 在短時間內收到大量併發寫入請求時
//   偶爾會出現連線被拒（ERR_CONNECTION_REFUSED）或暫時無回應
//   加上重試機制，前端能自動恢復，不會直接整片紅字噴錯
async function fetchJSON<T>(url: string, options?: RequestInit, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(options?.headers ?? {}),
        },
      })
      if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
      return res.json()
    } catch (err) {
      if (attempt === retries) throw err
      // 指數退避：第一次重試等 300ms，第二次等 600ms
      // 為什麼要等待：給 json-server 一點喘息時間恢復，立即重試很可能再次失敗
      await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
    }
  }
  throw new Error('無法連線到伺服器')
}

// ── 序列寫入 helper：取代 Promise.all 並行寫入 ──────────────
// 為什麼需要：json-server 用單一 db.json 檔案做持久化
//   多筆 PATCH 同時併發寫入容易造成寫入衝突或讓伺服器瞬間過載當機
//   改用 for...of 依序執行，每筆都等前一筆完成才送下一筆
//   犧牲一點速度（多筆食材會花更久時間），換取穩定性
async function patchSequentially(
  updates: { url: string; body: Record<string, unknown> }[]
): Promise<void> {
  for (const { url, body } of updates) {
    await fetchJSON(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
}

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
    ...options,
  })
}

// 新增銷售單（點餐）
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