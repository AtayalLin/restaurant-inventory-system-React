import type { User } from '../types'

/** 示範帳號：與後端 DemoUserSeeder 相同，密碼預設 demo1234 */
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_USERS: (User & { username: string })[] = [
  { id: 'u-owner', username: 'owner', name: '林老闆', role: 'OWNER', storeId: null },
  { id: 'u-manager', username: 'manager', name: '王店長', role: 'MANAGER', storeId: 'st1' },
  { id: 'u-staff', username: 'staff', name: '小陳', role: 'STAFF', storeId: 'st1' },
]
