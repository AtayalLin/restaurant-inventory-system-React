import type { User } from '../types'

/**
 * 示範帳號：目前還沒有後端登入（第 ⑤ 階段 Spring Boot + JWT 才會實作），
 * 先用固定帳號讓面試官切換身分，體驗不同角色看到的畫面差異。
 */
export const DEMO_USERS: User[] = [
  { id: 'u-owner', name: '林老闆', role: 'OWNER', storeId: null },
  { id: 'u-manager', name: '王店長', role: 'MANAGER', storeId: 'st1' },
  { id: 'u-staff', name: '小陳', role: 'STAFF', storeId: 'st1' },
]
