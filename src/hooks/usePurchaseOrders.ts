import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// useQuery：取得採購單列表
// useMutation：新增採購單、更新狀態、確認收貨
// useQueryClient：操作成功後刷新列表和食材庫存
// 關聯：src/pages/purchase/PurchasePage.tsx

import type { PurchaseOrder } from '../types'
// 關聯：src/types/index.ts
// PurchaseOrder：{
//   id, supplierId, status: PurchaseStatus,
//   items: PurchaseItem[],  ← [{ ingredientId, quantity, unitPrice }]
//   totalAmount, expectedDate, receivedDate,
//   note, createdAt
// }

const BASE = '/api'

// ── fetch helper：同 useProducts/useIngredients，處理 304 問題 ──
// 為什麼每個 hook 檔案都複製一份而不是共用：
//   目前規模小，共用會增加一個 utils 檔案的依賴層
//   之後重構時可以統一抽到 src/lib/fetchJSON.ts
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  })
  if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
  return res.json()
}

// ==========================================
// 採購單（PurchaseOrder）
// ==========================================

// 取得所有採購單列表
export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchaseOrders'],
    queryFn: () => fetchJSON<PurchaseOrder[]>(`${BASE}/purchaseOrders`),
  })
}

// 新增採購單
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
      // Omit<PurchaseOrder, 'id' | 'createdAt'>：不傳 id 和 createdAt，由這裡補上
      const res = await fetch(`${BASE}/purchaseOrders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('新增採購單失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

// 更新採購單狀態（PENDING→ORDERED 或 任何→CANCELLED）
export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder['status'] }) => {
      // PurchaseOrder['status']：取 PurchaseOrder 型別的 status 欄位型別
      // 等同於 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
      const res = await fetch(`${BASE}/purchaseOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('更新採購單狀態失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
    },
  })
}

// 確認收貨：更新採購單狀態為 RECEIVED + 更新每筆食材的庫存
export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: PurchaseOrder) => {
      // 為什麼傳整個 order 而不只是 id：
      //   需要 order.items 來知道要更新哪些食材、各加多少庫存

      // 第一步：取得所有相關食材的目前庫存
      // 為什麼需要先取得：PATCH 只能設定絕對值，不能直接 += 
      // 所以要先讀取目前庫存，再計算新庫存 = 目前庫存 + 採購數量
      const ingredientUpdates = await Promise.all(
        order.items.map(async (item) => {
          const res = await fetch(`${BASE}/ingredients/${item.ingredientId}`, {
            headers: { 'Cache-Control': 'no-cache' },
          })
          if (!res.ok) throw new Error(`取得食材資料失敗：${item.ingredientId}`)
          const ingredient = await res.json()
          return {
            id: item.ingredientId,
            newStock: ingredient.currentStock + item.quantity,
            // newStock：目前庫存 + 採購數量 = 收貨後的新庫存
          }
        })
      )
      // Promise.all：同時發出所有食材的 GET 請求，平行執行比逐一更快

      // 第二步：更新每筆食材的庫存
      await Promise.all(
        ingredientUpdates.map(({ id, newStock }) =>
          fetch(`${BASE}/ingredients/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentStock: newStock }),
          })
        )
      )

      // 第三步：更新採購單狀態為 RECEIVED + 記錄收貨日期
      const res = await fetch(`${BASE}/purchaseOrders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RECEIVED',
          receivedDate: new Date().toISOString(),
          // receivedDate：記錄實際收貨時間，供後續報表使用
        }),
      })
      if (!res.ok) throw new Error('確認收貨失敗')
      return res.json()
    },
    onSuccess: () => {
      // 收貨後同時刷新採購單列表和食材庫存列表
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      // 為什麼要刷新 ingredients：收貨後食材庫存已更新，庫存頁面需要同步
    },
  })
}