import { useQuery } from '@tanstack/react-query'
import { fetchJSON } from '../lib/fetchJSON'
import { API_BASE } from '../lib/config'
import type { Store } from '../types'

/** 門市清單：很少變動，快取 10 分鐘 */
export function useStores() {
  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: () => fetchJSON<Store[]>(`${API_BASE}/stores`),
    staleTime: 10 * 60 * 1000,
    retry: false, // fetchJSON 內已有重試
  })
}
