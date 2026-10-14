/**
 * 角色權限與門市範圍（純函式，有單元測試）
 *
 * 參考連鎖餐飲「總部統一菜單、中央廚房統一進貨、門市負責銷售」的分工：
 * - 總部 OWNER：所有功能，可切換查看任一門市或全部門市
 * - 店長 MANAGER：管理自己門市的銷售與食材庫存；採購單唯讀
 * - 員工 STAFF：只能操作自己門市的點餐與出餐
 *
 * 前端權限只負責「介面顯示」；真正的權限檢查之後由 Spring Boot 後端（JWT）負責。
 */
import type { SalesOrder, UserRole } from '../types'

export type Permission =
  | 'product:edit'     // 新增、編輯、刪除菜單商品（總部統一菜單）
  | 'inventory:edit'   // 新增、編輯、刪除食材
  | 'purchase:view'    // 進入採購進貨頁
  | 'purchase:edit'    // 建立採購單、下單、收貨、取消
  | 'sales:refund'     // 已完成訂單退款
  | 'store:switch'     // 切換門市、查看全部門市
  | 'report:crossStore' // 跨店營收比較

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  OWNER: ['product:edit', 'inventory:edit', 'purchase:view', 'purchase:edit', 'sales:refund', 'store:switch', 'report:crossStore'],
  MANAGER: ['inventory:edit', 'purchase:view', 'sales:refund'],
  STAFF: [],
}

export const ROLE_LABEL: Record<UserRole, string> = { OWNER: '總部', MANAGER: '店長', STAFF: '員工' }

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** 「全部門市」的代號；只有總部能選 */
export const ALL_STORES = 'ALL'
/** 舊資料沒有 storeId 時歸到這間門市 */
export const DEFAULT_STORE_ID = 'st1'

export const storeOf = (o: Pick<SalesOrder, 'storeId'>) => o.storeId ?? DEFAULT_STORE_ID

/** 依目前選擇的門市篩選訂單；ALL 表示不篩選 */
export function filterByStore<T extends Pick<SalesOrder, 'storeId'>>(orders: T[], storeId: string): T[] {
  return storeId === ALL_STORES ? orders : orders.filter(o => storeOf(o) === storeId)
}

/** 各門市在指定期間的已完成營收與訂單數，用於跨店比較（依營收由高到低） */
export function revenueByStore(
  orders: SalesOrder[], stores: { id: string; name: string }[], from: Date, to: Date,
): { storeId: string; name: string; revenue: number; orders: number }[] {
  const stats = new Map(stores.map(s => [s.id, { storeId: s.id, name: s.name, revenue: 0, orders: 0 }]))
  for (const o of orders) {
    const t = new Date(o.createdAt)
    if (o.status !== 'COMPLETED' || t < from || t >= to) continue
    const s = stats.get(storeOf(o))
    if (!s) continue // 已關閉或不存在的門市不列入
    s.revenue += o.total
    s.orders += 1
  }
  return [...stats.values()].sort((a, b) => b.revenue - a.revenue)
}
