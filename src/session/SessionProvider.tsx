// 目前登入者與選擇中的門市；包在 App 外層，任何元件都能用 useSession() 取得
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ALL_STORES, can, type Permission } from '../lib/permissions'
import { getAuth, setAuth, UNAUTHORIZED_EVENT } from '../lib/auth'
import { login as loginApi } from '../lib/authApi'
import type { User } from '../types'

interface Session {
  /** 未登入時為 null */
  user: User | null
  /** 目前查看的門市 id；總部可為 ALL_STORES */
  storeId: string
  setStoreId: (id: string) => void
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  can: (p: Permission) => boolean
}

const SessionContext = createContext<Session | null>(null)
const STORE_KEY = 'ris-session-store' // 記住總部上次查看的門市

/** 店長、員工固定在自己的門市；總部沿用上次選擇，沒有則看全部門市 */
function defaultStore(u: User | null): string {
  if (u?.storeId) return u.storeId
  try { return localStorage.getItem(STORE_KEY) ?? ALL_STORES } catch { return ALL_STORES }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getAuth()?.user ?? null)
  const [storeId, setStoreIdState] = useState(() => defaultStore(getAuth()?.user ?? null))

  const logout = useCallback(() => {
    setAuth(null)
    setUser(null)
  }, [])

  // token 過期或被拒（apiFetch 收到 401）→ 自動登出，RequireAuth 會導回登入頁
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const login = useCallback(async (username: string, password: string) => {
    const auth = await loginApi(username, password) // 失敗會拋出錯誤，由登入頁顯示
    setAuth(auth)
    setUser(auth.user)
    setStoreIdState(defaultStore(auth.user))
  }, [])

  // 沒有切換門市權限時忽略呼叫，避免員工透過程式改到別家店
  const setStoreId = useCallback((id: string) => {
    if (!user || !can(user.role, 'store:switch')) return
    setStoreIdState(id)
    try { localStorage.setItem(STORE_KEY, id) } catch { /* 忽略 */ }
  }, [user])

  const value = useMemo<Session>(() => ({
    user, storeId, setStoreId, login, logout,
    can: p => (user ? can(user.role, p) : false),
  }), [user, storeId, setStoreId, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook 與 Provider 放同檔較好維護
export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession 必須在 <SessionProvider> 內使用')
  return ctx
}

/** 已登入的頁面使用：保證 user 不是 null（RequireAuth 已擋下未登入） */
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('useCurrentUser 只能在登入後的頁面使用')
  return user
}
