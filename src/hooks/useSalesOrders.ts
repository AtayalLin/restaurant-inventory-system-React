import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// 關聯：src/pages/sales/SalesPage.tsx、SalesFormModal.tsx

import type { SalesOrder, Product, Ingredient } from '../types'
// SalesOrder：{ id, status, items: SalesItem[], subtotal, taxAmount, discount, total, channel, note, createdAt }
// SalesItem：{ productId, quantity, unitPrice }
// Product：需要 recipe 欄位計算食材消耗
// Ingredient：需要 currentStock 計算扣減後庫存

const BASE = '/api'

// ── fetch helper：處理 304 問題（同其他 hook 檔案）──────────
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  })
  if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
  return res.json()
}

// ── 稅額計算工具函式 ──────────────────────────────────────
// 為什麼獨立成函式：銷售模組多處需要計算稅額，集中定義避免重複
// 稅率來源：台灣餐飲業一般營業稅 5%（2025-2026 現行稅率）
// 無條件捨去：台灣發票慣例，消費者不需付零頭
export function calcTax(subtotal: number, taxRate = 5): number {
  return Math.floor(subtotal * taxRate / 100)
  // 範例：subtotal=180, taxRate=5 → Math.floor(9.0) = 9
  // 範例：subtotal=65, taxRate=5 → Math.floor(3.25) = 3（無條件捨去）
}

export function calcTotal(subtotal: number, taxAmount: number, discount = 0): number {
  return Math.round(subtotal + taxAmount - discount)
  // 四捨五入至整數：消費者付款金額取整數
  // discount：折扣金額，預設 0
}

// ==========================================
// 銷售單（SalesOrder）
// ==========================================

export function useSalesOrders() {
  return useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: () => fetchJSON<SalesOrder[]>(`${BASE}/salesOrders`),
  })
}

// 新增銷售單（點餐）
export function useCreateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<SalesOrder, 'id' | 'createdAt'>) => {
      // Omit<SalesOrder, 'id' | 'createdAt'>：不傳 id 和 createdAt
      const res = await fetch(`${BASE}/salesOrders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('新增銷售單失敗')
      return res.json()
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
      const res = await fetch(`${BASE}/salesOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('更新銷售單狀態失敗')
      return res.json()
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
      // 為什麼傳整個 order：需要 order.items 來計算食材消耗

      // ── 第一步：取得訂單內所有商品的 recipe ──────────────
      const products = await Promise.all(
        order.items.map(item =>
          fetchJSON<Product>(`${BASE}/products/${item.productId}`)
        )
      )
      // 每個商品的 recipe 定義了做這道菜需要哪些食材、各需多少

      // ── 第二步：彙總食材消耗量 ────────────────────────────
      // 為什麼用 Map 彙總而不是直接扣：
      //   同一訂單可能有多道菜用到同一食材（例如牛肉麵和牛肉炒飯都用牛肉）
      //   如果分開扣，第一次扣完後第二次讀取到的還是舊庫存
      //   先彙總總消耗量，最後只發一次 PATCH，確保庫存計算正確
      const consumptionMap = new Map<string, number>()
      // Map<食材id, 總消耗量>

      products.forEach((product, idx) => {
        const salesQty = order.items[idx].quantity
        // salesQty：這道菜賣出幾份

        product.recipe.forEach(recipeItem => {
          const consume = recipeItem.quantity * salesQty
          // 單份用量 × 銷售數量 = 這道菜的這種食材總消耗量
          // 範例：牛肉麵每份用 200g 牛腱，賣出 2 份 → 消耗 400g

          const current = consumptionMap.get(recipeItem.ingredientId) ?? 0
          consumptionMap.set(recipeItem.ingredientId, current + consume)
          // 累加：同一食材可能被多道菜用到，累計總消耗量
        })
      })

      // ── 第三步：取得食材目前庫存並計算新庫存 ────────────
      const ingredientIds = Array.from(consumptionMap.keys())
      const ingredients = await Promise.all(
        ingredientIds.map(id => fetchJSON<Ingredient>(`${BASE}/ingredients/${id}`))
      )
      // 只取有消耗到的食材，避免多餘的 API 呼叫

      // ── 第四步：更新每筆食材庫存 ──────────────────────────
      await Promise.all(
        ingredients.map(ingredient => {
          const consume = consumptionMap.get(ingredient.id) ?? 0
          const newStock = Math.max(0, ingredient.currentStock - consume)
          // Math.max(0, ...)：庫存最低到 0，不允許負數
          // 為什麼不阻擋：餐廳實際運營中，出餐後才發現食材不足是常見情況
          //   系統記錄到 0 並在庫存頁顯示「已缺貨」，老闆自行補貨

          return fetch(`${BASE}/ingredients/${ingredient.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentStock: newStock }),
          })
        })
      )

      // ── 第五步：更新銷售單狀態為 COMPLETED ───────────────
      const res = await fetch(`${BASE}/salesOrders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      if (!res.ok) throw new Error('完成銷售單失敗')
      return res.json()
    },
    onSuccess: () => {
      // 完成後同時刷新銷售單列表和食材庫存
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// 退款（COMPLETED → REFUNDED）
// 注意：退款不自動回補庫存（食材已消耗），需要老闆手動調整庫存
export function useRefundSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/salesOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      })
      if (!res.ok) throw new Error('退款失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
    },
  })
}