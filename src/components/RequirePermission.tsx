import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useCurrentUser, useSession } from '../session/SessionProvider'
import { ROLE_LABEL, type Permission } from '../lib/permissions'

/**
 * 路由守衛：沒有權限時顯示說明，而不是空白頁或直接報錯
 * （直接輸入網址也會被擋下，不只是把側欄選項藏起來）
 */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useSession()
  const user = useCurrentUser()
  if (can(permission)) return <>{children}</>

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md text-center">
      <ShieldAlert className="mx-auto text-ink-3" size={44} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-ink">沒有權限查看這個頁面</h2>
      <p className="mt-2 text-sm text-ink-2">目前身分是「{ROLE_LABEL[user.role]}」，可以登出後改用其他示範帳號登入。</p>
      <Link to="/dashboard" className="mt-6 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
        回到儀表板
      </Link>
    </div>
  )
}

export default RequirePermission
