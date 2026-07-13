import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// useQuery：用來「取得」資料，自動管理 loading/error/data 狀態
// useMutation：用來「新增/修改/刪除」資料
// useQueryClient：用來手動操作快取，例如操作成功後刷新列表

import type { Product, ProductCategory } from '../types'
// 從統一的型別定義檔引入，確保資料結構一致

import { fetchJSON } from '../lib/fetchJSON' // 新增：改用共用的 fetchJSON，取代原本檔案內重複定義的版本


// ==========================================
// API 基礎路徑（透過 vite proxy 轉發到 json-server）
// fetch('/api/products') → proxy → http://localhost:3001/products
// ==========================================
const BASE = '/api'

// ── fetch helper：處理 304 Not Modified + 自動重試 ──────────── 因為考慮到可維護性，fetchJSON 已經搬到 src/lib/fetchJSON.ts，這裡不再重複定義，做為參考資料備註於此。
// 為什麼需要：瀏覽器自動帶 If-None-Match 快取標頭
//   json-server 收到後回傳 304 + 空 body
//   res.json() 解析空 body 拋出 SyntaxError → TanStack Query 無限重試
//   加上 Cache-Control: no-cache 強制每次取得最新資料
// 為什麼加 retry：json-server 在大量併發寫入時可能短暫斷線
//   重試機制讓前端自動恢復，不會直接整片紅字噴錯
// async function fetchJSON<T>(url: string, retries = 2): Promise<T> {
//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       const res = await fetch(url, {
//         headers: {
//           'Cache-Control': 'no-cache',
//           'Pragma': 'no-cache',
//         },
//       })
//       if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
//       return res.json()
//     } catch (err) {
//       if (attempt === retries) throw err
//       // 指數退避：第一次重試等 300ms，第二次等 600ms
//       await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
//     }
//   }
//   throw new Error('無法連線到伺服器')
// }

// ==========================================
// 商品分類（ProductCategory）
// ==========================================

// 取得所有商品分類 - 給下拉選單使用
// 【本次修正】加上 retry: false，理由見下方 useProducts 的完整說明
export function useProductCategories() {
  return useQuery<ProductCategory[]>({
    queryKey: ['productCategories'],
    queryFn: () => fetchJSON<ProductCategory[]>(`${BASE}/productCategories`),
    retry: false,
  })
}

// ==========================================
// 商品（Product）
// ==========================================

// 取得所有商品列表
// options：可選的額外 query 設定（例如 Dashboard 要用的 refetchInterval）
//   不傳的話沿用預設行為，其他頁面（ProductsPage）完全不受影響
//
// 【本次修正】加上 retry: false：
//   fetchJSON 內部已經有自己的重試機制（預設重試 2 次 + 指數退避，總共最多嘗試 3 次）。
//   TanStack Query 的 useQuery 預設「本身」也會重試（預設 3 次，退避時間 1 秒/2 秒/4 秒）。
//   這兩層重試會疊加：fetchJSON 失敗一輪 → TanStack Query 判定失敗又觸發重試
//     → fetchJSON 再跑一輪 3 次 → 疊加下來最多可能真正發送 9 次請求，
//     且要等 10 秒以上 isError 才會變成 true。
//   對使用者來說，這段時間畫面會一直停在 loading 狀態，體感像是「卡死」而不是「出錯」。
//   既然 fetchJSON 已經負責重試，這裡改成 retry: false，讓 TanStack Query
//   只負責「第一次請求失敗後，直接把結果交給 isError」，不要再重試一次。
export function useProducts(options?: { refetchInterval?: number; refetchOnWindowFocus?: boolean }) {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => fetchJSON<Product[]>(`${BASE}/products`),
    retry: false,
    ...options,
  })
}

// 新增商品 - 傳入不含 id/createdAt 的資料，由這裡補上
// 【本次未修改】useMutation 不需要加 retry: false：
//   Mutation（新增/修改/刪除）如果重試，可能會造成「重複新增」這種副作用
//   （例如：第一次 POST 其實有成功，只是回應逾時被判定失敗，重試又送出第二次 POST，
//   結果資料庫多了一筆重複資料）。
//   TanStack Query 的 useMutation 預設本來就不會自動重試（跟 useQuery 行為不同），
//   所以這裡維持原樣不用額外加設定，這也是為什麼只有 useQuery 需要處理疊加重試問題。
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Product, 'id' | 'createdAt'>) => {
      const res = await fetch(`${BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('新增商品失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 更新商品 - 用 PATCH 只更新有變動的欄位（json-server v1 支援）
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const res = await fetch(`${BASE}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('更新商品失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// 刪除商品
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/products/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('刪除商品失敗')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}