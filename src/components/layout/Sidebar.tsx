import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, UtensilsCrossed, Package, ShoppingCart, Receipt,
  FlaskConical, Settings, X, type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  devOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '儀表板',   icon: LayoutDashboard },
  { to: '/products',  label: '菜單商品', icon: UtensilsCrossed },
  { to: '/inventory', label: '食材庫存', icon: Package },
  { to: '/purchase',  label: '採購進貨', icon: ShoppingCart },
  { to: '/sales',     label: '銷售管理', icon: Receipt },
  // 以下兩項只在開發模式（npm run dev）顯示：
  //   併發測試是驗證樂觀鎖的開發工具，系統設定尚未完成，
  //   正式展示時不出現在導覽列，避免使用者點到未完成的頁面
  { to: '/testing',   label: '併發測試', icon: FlaskConical, devOnly: true },
  { to: '/settings',  label: '系統設定', icon: Settings,     devOnly: true },
]

const visibleItems = NAV_ITEMS.filter(item => !item.devOnly || import.meta.env.DEV)

interface SidebarProps {
  /** 手機版：側欄是否展開 */
  open: boolean
  /** 手機版：關閉側欄（點選項目或遮罩時呼叫） */
  onClose: () => void
}

function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* 手機版遮罩：側欄展開時覆蓋內容，點擊即關閉 */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 桌機：固定在左側；手機：從左側滑出的抽屜 */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-[#1E3A5F] transition-transform duration-200
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-6">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <UtensilsCrossed size={18} aria-hidden="true" />
              智慧餐飲
            </div>
            <div className="mt-1 text-xs text-white/60">進銷存管理系統</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="關閉選單"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4" aria-label="主要功能">
          {visibleItems.map(({ to, label, icon: Icon, devOnly }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-[3px] px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'border-sky-400 bg-white/10 text-white'
                    : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {devOnly && (
                <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">DEV</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          v0.1.0 · 林家齊 Ataya Lin
        </div>
      </aside>
    </>
  )
}

export default Sidebar
