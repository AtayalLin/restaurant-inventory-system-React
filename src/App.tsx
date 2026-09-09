import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout'

import Dashboard from './pages/Dashboard'
import ProductsPage from './pages/products/ProductsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import PurchasePage from './pages/purchase/PurchasePage'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/SettingsPage'
import ConcurrencyTestPage from './pages/testing/ConcurrencyTestPage'
// 【修正 Bug 4】補上匯入，否則畫面已經寫好但路由沒接，使用者永遠進不去

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products"  element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="purchase"  element={<PurchasePage />} />
          <Route path="sales"     element={<SalesPage />} />
          <Route path="settings"  element={<SettingsPage />} />
          <Route path="testing"   element={<ConcurrencyTestPage />} />
          {/* 【修正 Bug 4】新增併發測試路由 */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App