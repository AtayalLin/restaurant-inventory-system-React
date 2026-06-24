import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/dashboard', label: '📊 儀表板' },
  { to: '/products',  label: '🍽️ 菜單商品' },
  { to: '/inventory', label: '📦 食材庫存' },
  { to: '/purchase',  label: '🛒 採購進貨' },
  { to: '/sales',     label: '💰 銷售管理' },
  { to: '/settings',  label: '⚙️ 系統設定' },
]

function Sidebar() {
  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: '#1E3A5F',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>
          🍴 智慧餐飲
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
          進銷存管理系統
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 20px',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              textDecoration: 'none',
              fontSize: '14px',
              borderLeft: isActive ? '3px solid #1E40AF' : '3px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '11px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        v0.1.0 · 林家齊 Ataya Lin
      </div>
    </aside>
  )
}

export default Sidebar