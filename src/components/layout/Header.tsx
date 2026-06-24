import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '儀表板',
  '/products':  '菜單商品管理',
  '/inventory': '食材庫存管理',
  '/purchase':  '採購進貨管理',
  '/sales':     '銷售管理',
  '/settings':  '系統設定',
}

function Header() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? '智慧餐飲進銷存'

  return (
    <header style={{
      height: '64px',
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1E3A5F', margin: 0 }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '20px', cursor: 'pointer' }} title="低庫存警示">🔔</span>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>老闆</span>
      </div>
    </header>
  )
}

export default Header