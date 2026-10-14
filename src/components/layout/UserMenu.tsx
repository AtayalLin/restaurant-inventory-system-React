import { LogOut, MapPin, UserRound } from 'lucide-react'
import { useCurrentUser, useSession } from '../../session/SessionProvider'
import { useStores } from '../../hooks/useStores'
import { ALL_STORES, ROLE_LABEL } from '../../lib/permissions'

const selectClass = 'h-9 rounded-lg border border-line bg-white pl-8 pr-2 text-sm text-ink focus:outline-none focus:ring-4 focus:ring-brand-100'

/**
 * 標題列右側：門市切換＋目前使用者與登出
 * 總部可以切換門市（含「全部門市」）；店長、員工只顯示自己的門市名稱
 */
function UserMenu() {
  const { storeId, setStoreId, logout, can } = useSession()
  const user = useCurrentUser()
  const { data: stores = [] } = useStores()
  const storeName = (id: string | null) => stores.find(s => s.id === id)?.name ?? ''

  return (
    <div className="flex items-center gap-2">
      {/* 門市 */}
      <label className="relative">
        <span className="sr-only">目前門市</span>
        <MapPin size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        {can('store:switch') ? (
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className={`${selectClass} max-w-[8.5rem] sm:max-w-none`}>
            <option value={ALL_STORES}>全部門市</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg bg-canvas pl-8 pr-3 text-sm text-ink-2">{storeName(storeId)}</span>
        )}
      </label>

      {/* 目前使用者＋登出；要換身分就登出後選另一個示範帳號 */}
      <span className="hidden items-center gap-1.5 text-sm text-ink-2 sm:inline-flex">
        <UserRound size={15} className="text-ink-3" aria-hidden="true" />
        {user.name}
        <span className="text-xs text-ink-3">（{ROLE_LABEL[user.role]}{user.storeId ? `・${storeName(user.storeId)}` : ''}）</span>
      </span>
      <button
        type="button"
        onClick={logout}
        aria-label="登出"
        title="登出"
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-sm text-ink-2 hover:bg-slate-50 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
      >
        <LogOut size={15} aria-hidden="true" />
        <span className="hidden sm:inline">登出</span>
      </button>
    </div>
  )
}

export default UserMenu
