import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

// 404 頁面：網址打錯或連到不存在的頁面時顯示，避免整個內容區空白
function NotFoundPage() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <SearchX className="mx-auto text-ink-3" size={48} aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-ink">找不到這個頁面</h2>
      <p className="mt-2 text-sm text-ink-2">網址可能打錯了，或這個頁面已經移除。</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        回到儀表板
      </Link>
    </div>
  )
}

export default NotFoundPage
