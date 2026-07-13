import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// useQuery：取得食材列表，自動管理 loading/error/data 狀態
// useMutation：新增、修改、刪除食材
// useQueryClient：操作成功後讓快取失效，觸發列表自動刷新
// 關聯：這些 hook 在 src/pages/inventory/InventoryPage.tsx 使用

import type { Ingredient, Supplier } from '../types'
// 關聯：src/types/index.ts
// Ingredient 型別：{
//   id, name, unit, category, supplierId: string|null,
//   currentStock, safetyStock, expiryDays: number|null,
//   costPerUnit, createdAt
// }
// Supplier 型別：{ id, name, contact, phone, paymentTerm, createdAt }
// 為什麼同時引入 Supplier：食材列表需要顯示供應商名稱，要一起取得

import { fetchJSON } from '../lib/fetchJSON' // 新增


const BASE = '/api'
// Vite proxy 會把 /api/... 轉發到 http://localhost:3001/...
// 關聯：vite.config.ts 的 proxy 設定

// ── fetch helper：處理 304 Not Modified ──────────────────── 因為考慮到可維護性，fetchJSON 已經搬到 src/lib/fetchJSON.ts，這裡不再重複定義，做為參考資料備註於此。
// 為什麼需要：瀏覽器自動帶 If-None-Match 快取標頭
//   json-server 收到後回傳 304 + 空 body
//   res.json() 解析空 body 拋出 SyntaxError → TanStack Query 無限重試
//   加上 Cache-Control: no-cache 強制每次取得最新資料
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
//       await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
//     }
//   }
//   throw new Error('無法連線到伺服器')
// }


// ==========================================
// 供應商（Supplier）- 給食材表單的下拉選單使用
// ==========================================

// 【本次修正】加上 retry: false，理由同 useIngredients（見下方完整說明），
//   避免 fetchJSON 內部重試 + useQuery 外層重試疊加，導致 isError 要等超過 10 秒才觸發
export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    // 快取 key：TanStack Query 用這個識別快取，相同 key 不重複 fetch
    queryFn: () => fetchJSON<Supplier[]>(`${BASE}/suppliers`),
    retry: false,
    // 為什麼改用 fetchJSON：
    //   瀏覽器會自動帶 If-None-Match 快取標頭
    //   json-server 收到後回傳 304 + 空 body
    //   res.json() 解析空 body 會拋出 SyntaxError，導致無限重試
    //   fetchJSON 加上 Cache-Control: no-cache 強制略過快取
  })
}
// ==========================================
// 食材（Ingredient）
// ==========================================

// 取得所有食材列表
//
// 【本次修正】加上 retry: false：
//   fetchJSON 內部已經有自己的重試機制（重試 2 次 + 指數退避，最多嘗試 3 次）。
//   TanStack Query 的 useQuery 預設本身也會重試（預設 3 次），
//   兩層重試疊加會讓失敗判定拖到 10 秒以上，Dashboard 的 isError 錯誤提示
//   （見 useDashboard.ts）要等很久才會顯示，使用者體感像是卡住而非出錯。
//   讓 fetchJSON 專心處理重試，TanStack Query 這層改成「失敗一次就回報」。
export function useIngredients(options?: { refetchInterval?: number; refetchOnWindowFocus?: boolean }) {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => fetchJSON<Ingredient[]>(`${BASE}/ingredients`),
    retry: false,
    ...options,
  })
}

// 新增食材
// 【本次未修改】useMutation 維持原樣，不加 retry: false：
//   TanStack Query 的 useMutation 預設本來就不會自動重試，跟 useQuery 行為不同，
//   而且新增/修改/刪除這類「有副作用」的操作，重試可能造成重複寫入，
//   所以不需要額外處理，也不應該主動加上 retry。
export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Ingredient, 'id' | 'createdAt'>) => {
      // Omit<Ingredient, 'id' | 'createdAt'>：
      //   新增時不需要傳 id（由這裡產生）和 createdAt（由這裡補上）
      //   TypeScript 會確保其他所有必填欄位都有傳入
      const res = await fetch(`${BASE}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          id: crypto.randomUUID(),
          // crypto.randomUUID()：瀏覽器內建的 UUID 產生器，不需要額外套件
          // 產生範例：'550e8400-e29b-41d4-a716-446655440000'
          createdAt: new Date().toISOString(),
          // toISOString()：產生 ISO 8601 格式，範例：'2026-06-24T08:00:00.000Z'
          // 為什麼用 ISO 8601：跨時區標準格式，json-server 排序也用這個
        }),
      })
      if (!res.ok) throw new Error('新增食材失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      // invalidateQueries：讓 ['ingredients'] 快取失效
      // 效果：useIngredients() 自動重新 fetch，列表即時更新
    },
  })
}

// 更新食材
export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ingredient> }) => {
      // Partial<Ingredient>：所有欄位都變成選填
      // 為什麼用 Partial：PATCH 語意是「部分更新」，只傳有變動的欄位
      // 比 PUT（全量更新）更安全，不會意外清除沒有修改的欄位
      const res = await fetch(`${BASE}/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('更新食材失敗')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// 刪除食材
export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/ingredients/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('刪除食材失敗')
      // DELETE 成功時 json-server 回傳空物件 {}，不需要 return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}