import { describe, expect, it } from 'vitest'
import { ALL_STORES, can, filterByStore, revenueByStore } from './permissions'
import type { SalesOrder } from '../types'

describe('can（角色權限）', () => {
  it('總部擁有全部權限', () => {
    expect(can('OWNER', 'product:edit')).toBe(true)
    expect(can('OWNER', 'store:switch')).toBe(true)
  })

  it('店長可管庫存與退款，但不能改菜單、不能下採購單、不能切換門市', () => {
    expect(can('MANAGER', 'inventory:edit')).toBe(true)
    expect(can('MANAGER', 'sales:refund')).toBe(true)
    expect(can('MANAGER', 'purchase:view')).toBe(true)
    expect(can('MANAGER', 'purchase:edit')).toBe(false)
    expect(can('MANAGER', 'product:edit')).toBe(false)
    expect(can('MANAGER', 'store:switch')).toBe(false)
  })

  it('員工沒有任何管理權限', () => {
    expect(can('STAFF', 'inventory:edit')).toBe(false)
    expect(can('STAFF', 'purchase:view')).toBe(false)
    expect(can('STAFF', 'sales:refund')).toBe(false)
  })
})

const o = (storeId: string | undefined, total: number, createdAt: string, status: SalesOrder['status'] = 'COMPLETED') =>
  ({ storeId, total, createdAt, status }) as SalesOrder

describe('filterByStore', () => {
  const orders = [o('st1', 100, '2026-10-14'), o('st2', 200, '2026-10-14'), o(undefined, 300, '2026-10-14')]

  it('選全部門市時不篩選', () => {
    expect(filterByStore(orders, ALL_STORES)).toHaveLength(3)
  })

  it('沒有 storeId 的舊資料歸到預設門市 st1', () => {
    expect(filterByStore(orders, 'st1').map(x => x.total)).toEqual([100, 300])
    expect(filterByStore(orders, 'st2').map(x => x.total)).toEqual([200])
  })
})

describe('revenueByStore', () => {
  it('只計算期間內的已完成訂單，依營收排序', () => {
    const stores = [{ id: 'st1', name: '左營店' }, { id: 'st2', name: '鳳山店' }]
    const orders = [
      o('st1', 100, '2026-10-14T10:00:00'), o('st2', 500, '2026-10-14T11:00:00'),
      o('st2', 999, '2026-10-14T12:00:00', 'REFUNDED'), // 退款不算
      o('st1', 999, '2026-10-13T12:00:00'),             // 期間外不算
      o('st9', 999, '2026-10-14T12:00:00'),             // 不存在的門市不算
    ]
    const r = revenueByStore(orders, stores, new Date('2026-10-14T00:00:00'), new Date('2026-10-15T00:00:00'))
    expect(r).toEqual([
      { storeId: 'st2', name: '鳳山店', revenue: 500, orders: 1 },
      { storeId: 'st1', name: '左營店', revenue: 100, orders: 1 },
    ])
  })
})
