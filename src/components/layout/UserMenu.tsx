import { MapPin, UserRound } from 'lucide-react'
import { useSession } from '../../session/SessionProvider'
import { DEMO_USERS } from '../../session/demoUsers'
import { useStores } from '../../hooks/useStores'
import { ALL_STORES, ROLE_LABEL } from '../../lib/permissions'

const selectClass = 'h-9 rounded-lg border border-line bg-white pl-8 pr-2 text-sm text-ink focus:outline-none focus:ring-4 focus:ring-brand-100'

/**
 * 標題列右側：門市切換＋示範身分切換
 * 總部可以切換門市（含「全部門市」）；店長、員工只顯示自己的門市名稱
 */
function UserMenu() {
  const { user, storeId, setStoreId, switchUser, can } = useSession()
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

      {/* 示範身分：之後串接後端登入後改為使用者選單 */}
      <label className="relative">
        <span className="sr-only">示範身分</span>
        <UserRound size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <select value={user.id} onChange={e => switchUser(e.target.value)} className={`${selectClass} max-w-[7.5rem] sm:max-w-none`}
          title="切換示範身分，查看不同角色的權限差異">
          {DEMO_USERS.map(u => (
            <option key={u.id} value={u.id}>{u.name}（{ROLE_LABEL[u.role]}{u.storeId ? `・${storeName(u.storeId)}` : ''}）</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default UserMenu
