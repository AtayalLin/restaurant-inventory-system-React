import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout'

import Dashboard from './pages/Dashboard'
import ProductsPage from './pages/products/ProductsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import PurchasePage from './pages/purchase/PurchasePage'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/SettingsPage'
import ConcurrencyTestPage from './pages/testing/ConcurrencyTestPage'
import NotFoundPage from './pages/NotFoundPage'
import RequirePermission from './components/RequirePermission'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
// 【修正 Bug 4】補上匯入，否則畫面已經寫好但路由沒接，使用者永遠進不去

function App() {
  // basename：部署在 GitHub Pages 子路徑（/restaurant-inventory-system-React/）時，路由要以它為根
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 以下頁面都需要登入 */}
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products"  element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchase"  element={<RequirePermission permission="purchase:view"><PurchasePage /></RequirePermission>} />
          <Route path="sales"     element={<SalesPage />} />
          <Route path="settings"  element={<SettingsPage />} />
          <Route path="testing"   element={<ConcurrencyTestPage />} />
          {/* 【修正 Bug 4】新增併發測試路由 */}
          <Route path="*" element={<NotFoundPage />} />
          {/* 其他未定義的網址一律顯示 404 頁面 */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App