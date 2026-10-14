import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import UserMenu from './UserMenu'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '儀表板',
  '/products':  '菜單商品管理',
  '/inventory': '食材庫存管理',
  '/purchase':  '採購進貨管理',
  '/sales':     '銷售管理',
  '/testing':   '併發測試',
  '/settings':  '系統設定',
}

interface HeaderProps {
  menuOpen: boolean
  onMenuClick: () => void
}

function Header({ menuOpen, onMenuClick }: HeaderProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? '智慧餐飲進銷存'

  return (
    <header className="sticky top-0 z-20 flex print:hidden h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        {/* 漢堡選單：只在手機版顯示 */}
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 rounded p-1.5 text-[#1E3A5F] hover:bg-slate-100 md:hidden"
          aria-label="開啟選單"
          aria-controls="app-sidebar"
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
        </button>
        <h1 className="m-0 hidden text-lg font-semibold text-brand-800 sm:block">{title}</h1>
      </div>
      <UserMenu />
    </header>
  )
}

export default Header
