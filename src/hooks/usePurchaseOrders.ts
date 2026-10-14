import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PurchaseOrder } from '../types'
import { fetchJSON } from '../lib/fetchJSON'
import { receivePurchaseOrder } from '../lib/orderActions'
import { API_BASE } from '../lib/config'

const BASE = API_BASE

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
    mutationFn: (order: PurchaseOrder) => receivePurchaseOrder(order), // 優先由後端交易處理，見 lib/orderActions.ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] })
    },
  })
}