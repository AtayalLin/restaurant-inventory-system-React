import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// BrowserRouter：提供路由環境，讓整個 App 可以使用路由功能
// Routes：路由容器，包住所有 Route
// Route：定義 URL 路徑對應哪個元件
// Navigate：重新導向，用來把 / 自動跳到 /dashboard

import Layout from './components/layout/Layout'
// 關聯：src/components/layout/Layout.tsx
// Layout 是所有頁面共用的外框（Sidebar + Header + 主內容區）

import Dashboard from './pages/Dashboard'
import ProductsPage from './pages/products/ProductsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import PurchasePage from './pages/purchase/PurchasePage'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/SettingsPage'
// 以上六個是各模組的頁面元件，對應六條路由

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout 包住所有子路由，讓每個頁面都有 Sidebar 和 Header */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          {/* index route：進入 / 時自動導向 /dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products"  element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchase"  element={<PurchasePage />} />
          <Route path="sales"     element={<SalesPage />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App