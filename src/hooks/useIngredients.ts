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

const BASE = '/api'
// Vite proxy 會把 /api/... 轉發到 http://localhost:3001/...
// 關聯：vite.config.ts 的 proxy 設定

// ── fetch helper：處理 304 Not Modified ────────────────────
// 為什麼需要：瀏覽器自動帶 If-None-Match 快取標頭
//   json-server 收到後回傳 304 + 空 body
//   res.json() 解析空 body 拋出 SyntaxError → TanStack Query 無限重試
//   加上 Cache-Control: no-cache 強制每次取得最新資料
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
// 供應商（Supplier）- 給食材表單的下拉選單使用
// ==========================================

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    // 快取 key：TanStack Query 用這個識別快取，相同 key 不重複 fetch
    queryFn: () => fetchJSON<Supplier[]>(`${BASE}/suppliers`),
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
export function useIngredients() {
  return useQuery<Ingredient[]>({
    queryKey: ['ingredients'],
    queryFn: () => fetchJSON<Ingredient[]>(`${BASE}/ingredients`),
  })
}

// 新增食材
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