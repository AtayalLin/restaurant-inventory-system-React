import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PurchaseOrder } from '../types'
import { fetchJSON } from '../lib/fetchJSON'
import { applyStockChangeWithLock } from '../lib/stockOperations'

const BASE = '/api'

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchaseOrders'],
    queryFn: () => fetchJSON<PurchaseOrder[]>(`${BASE}/purchaseOrders`),
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<PurchaseOrder, 'id' | 'createdAt'>) => {
      return fetchJSON<PurchaseOrder>(`${BASE}/purchaseOrders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder['status'] }) => {
      return fetchJSON<PurchaseOrder>(`${BASE}/purchaseOrders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: PurchaseOrder) => {
      for (const item of order.items) {
        // 【修正 Bug 8】補上必填欄位 testBatchId：採購單不涉及併發測試，固定傳 null
        await applyStockChangeWithLock(item.ingredientId, item.quantity, {
          changeType: 'PURCHASE_RECEIVE',
          referenceType: 'PURCHASE_ORDER',
          referenceId: order.id,
          testBatchId: null, // 【新增】
        })
      }

      return fetchJSON<PurchaseOrder>(`${BASE}/purchaseOrders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED', receivedDate: new Date().toISOString() }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] })
    },
  })
}