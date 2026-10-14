/**
 * 登入 API：Spring Boot 後端與線上 Demo 都提供 POST /auth/login
 * 連到 json-server（沒有登入 API，回一般 404）時，改用本機示範帳號登入，方便前端單獨開發
 */
import { API_BASE } from './config'
import type { AuthState } from './auth'
import { DEMO_PASSWORD, DEMO_USERS } from '../session/demoUsers'
import type { User } from '../types'

export async function login(username: string, password: string): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const isProblem = (res.headers.get('content-type') ?? '').includes('problem+json')

  if (res.status === 404 && !isProblem) return offlineLogin(username, password)
  if (res.status === 401) throw new Error('帳號或密碼錯誤')
  if (!res.ok) throw new Error(`登入失敗（${res.status}），請確認後端是否啟動`)

  const data = (await res.json()) as { token: string; user: User }
  return { token: data.token, user: data.user }
}

/** json-server 模式：沒有後端驗證，token 為 null，權限只在前端畫面上生效 */
function offlineLogin(username: string, password: string): AuthState {
  const user = DEMO_USERS.find(u => u.username === username)
  if (!user || password !== DEMO_PASSWORD) throw new Error('帳號或密碼錯誤')
  return { token: null, user: { id: user.id, name: user.name, role: user.role, storeId: user.storeId } }
}
