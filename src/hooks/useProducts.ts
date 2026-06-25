import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// useQuery：用來「取得」資料，自動管理 loading/error/data 狀態
// useMutation：用來「新增/修改/刪除」資料
// useQueryClient：用來手動操作快取，例如操作成功後刷新列表

import type { Product, ProductCategory } from '../types'
// 從統一的型別定義檔引入，確保資料結構一致

// ==========================================
// API 基礎路徑（透過 vite proxy 轉發到 json-server）
// fetch('/api/products') → proxy → http://localhost:3001/products
// ==========================================
const BASE = '/api'

// ── fetch helper：處理 304 Not Modified ──────────────────────
// 為什麼需要：瀏覽器自動帶 If-None-Match 快取標頭
//   json-server 收到後回傳 304 + 空 body
//   res.json() 解析空 body 拋出 SyntaxError → TanStack Query 無限重試
//   加上 Cache-Control: no-cache 強制每次取得最新資料
// 為什麼用泛型 <T>：讓每個呼叫點自行指定回傳型別，一個函式通用所有 API
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
// 商品分類（ProductCategory）
// ==========================================

// 取得所有商品分類 - 給下拉選單使用
export function useProductCategories() {
  return useQuery<ProductCategory[]>({
    queryKey: ['productCategories'],
    queryFn: () => fetchJSON<ProductCategory[]>(`${BASE}/productCategories`),
    // 改用 fetchJSON：避免 304 快取問題
  })
}

// ==========================================
// 商品（Product）
// ==========================================

// 取得所有商品列表
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => fetchJSON<Product[]>(`${BASE}/products`),
    // 改用 fetchJSON：避免 304 快取問題
  })
}

// 新增商品 - 傳入不含 id/createdAt 的資料，由這裡補上
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