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

// ==========================================
// 商品分類（ProductCategory）
// ==========================================

// 取得所有商品分類 - 給下拉選單使用
export function useProductCategories() {
  return useQuery<ProductCategory[]>({
    queryKey: ['productCategories'],        // 快取的唯一識別 key
    queryFn: async () => {
      const res = await fetch(`${BASE}/productCategories`)
      if (!res.ok) throw new Error('取得商品分類失敗')
      return res.json()
    },
  })
}

// ==========================================
// 商品（Product）
// ==========================================

// 取得所有商品列表
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],                 // 快取 key，useMutation 成功後用此 key 刷新
    queryFn: async () => {
      const res = await fetch(`${BASE}/products`)
      if (!res.ok) throw new Error('取得商品列表失敗')
      return res.json()
    },
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
          id: crypto.randomUUID(),          // 瀏覽器內建 UUID 產生器
          createdAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('新增商品失敗')
      return res.json()
    },
    onSuccess: () => {
      // 新增成功後，讓 ['products'] 快取失效 → 自動重新 fetch 列表
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