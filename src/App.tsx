import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout'
import RequirePermission from './components/RequirePermission'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'       // 登入頁是第一個畫面，直接打包不延遲載入
import NotFoundPage from './pages/NotFoundPage'
import { Pages } from './routes/pages'           // 其他頁面用到才載入，見 routes/pages.ts

function App() {
  // basename：部署在 GitHub Pages 子路徑（/restaurant-inventory-system-React/）時，路由要以它為根
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 以下頁面都需要登入；頁面載入中的畫面由 Layout 的 Suspense 處理 */}
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Pages.Dashboard />} />
          <Route path="products"  element={<Pages.Products />} />
          <Route path="inventory" element={<Pages.Inventory />} />
          <Route path="purchase"  element={<RequirePermission permission="purchase:view"><Pages.Purchase /></RequirePermission>} />
          <Route path="purchase/:id/print" element={<RequirePermission permission="purchase:view"><Pages.PurchasePrint /></RequirePermission>} />
          <Route path="sales"     element={<Pages.Sales />} />
          <Route path="settings"  element={<Pages.Settings />} />
          <Route path="testing"   element={<Pages.Testing />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
