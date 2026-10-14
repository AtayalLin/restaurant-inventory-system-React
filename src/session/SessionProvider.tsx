// 目前登入者與選擇中的門市；包在 App 外層，任何元件都能用 useSession() 取得
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ALL_STORES, can, type Permission } from '../lib/permissions'
import { DEMO_USERS } from './demoUsers'
import type { User } from '../types'

interface Session {
  user: User
  /** 目前查看的門市 id；總部可為 ALL_STORES */
  storeId: string
  setStoreId: (id: string) => void
  switchUser: (userId: string) => void
  can: (p: Permission) => boolean
}

const SessionContext = createContext<Session | null>(null)
const STORAGE_KEY = 'ris-session-user'   // 記住上次選的示範身分，重新整理不會跳回總部
const STORE_KEY = 'ris-session-store'     // 記住總部上次查看的門市

function loadUser(): User {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return DEMO_USERS.find(u => u.id === id) ?? DEMO_USERS[0]
  } catch {
    return DEMO_USERS[0] // 無痕模式等無法使用 localStorage 時
  }
}

/** 店長、員工固定在自己的門市；總部沿用上次選擇，沒有則看全部門市 */
function defaultStore(u: User): string {
  if (u.storeId) return u.storeId
  try { return localStorage.getItem(STORE_KEY) ?? ALL_STORES } catch { return ALL_STORES }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(loadUser)
  const [storeId, setStoreIdState] = useState(() => defaultStore(loadUser()))

  const switchUser = useCallback((userId: string) => {
    const next = DEMO_USERS.find(u => u.id === userId)
    if (!next) return
    setUser(next)
    setStoreIdState(defaultStore(next))
    try { localStorage.setItem(STORAGE_KEY, next.id) } catch { /* 忽略 */ }
  }, [])

  // 沒有切換門市權限時忽略呼叫，避免員工透過程式改到別家店
  const setStoreId = useCallback((id: string) => {
    if (!can(user.role, 'store:switch')) return
    setStoreIdState(id)
    try { localStorage.setItem(STORE_KEY, id) } catch { /* 忽略 */ }
  }, [user.role])

  const value = useMemo<Session>(() => ({
    user, storeId, setStoreId, switchUser,
    can: p => can(user.role, p),
  }), [user, storeId, setStoreId, switchUser])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook 與 Provider 放同檔較好維護
export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession 必須在 <SessionProvider> 內使用')
  return ctx
}
