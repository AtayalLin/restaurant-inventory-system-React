/**
 * 登入 token 的保存與 API 請求的共用入口
 *
 * - token 存在記憶體，並同步到 localStorage（重新整理不用重登）。
 *   localStorage 可能被 XSS 讀取，正式環境可改用 httpOnly Cookie；本專案先以簡單、可展示為主。
 * - apiFetch：所有呼叫自家 /api 的請求都經過這裡，統一帶上 Authorization 標頭；
 *   收到 401（token 過期或無效）時發出事件，由 SessionProvider 登出並導回登入頁。
 *   注意：n8n、NVIDIA 等外部服務不要用 apiFetch，以免把 token 送給第三方。
 */
import type { User } from '../types'

const STORAGE_KEY = 'ris-auth'
export const UNAUTHORIZED_EVENT = 'ris:unauthorized'

export interface AuthState {
  /** JWT；連到 json-server（沒有登入 API）時為 null */
  token: string | null
  user: User
}

let current: AuthState | null = loadAuth()

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthState) : null
  } catch {
    return null
  }
}

export function getAuth(): AuthState | null {
  return current
}

export function setAuth(state: AuthState | null): void {
  current = state
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無痕模式等無法使用 localStorage 時，只保留在記憶體
  }
}

/** 呼叫自家 API：自動帶 token，401 時通知登出 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (current?.token) headers.set('Authorization', `Bearer ${current.token}`)
  const res = await fetch(url, { ...init, headers })
  // typeof 判斷：測試在 Node 執行時沒有 window
  if (res.status === 401 && current?.token && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return res
}
