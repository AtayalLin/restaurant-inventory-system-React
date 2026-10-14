/**
 * 各頁面以「用到才載入」（code splitting）方式引入
 *
 * 為什麼：原本所有頁面打包在同一個 JS 檔，登入頁就要下載儀表板的圖表套件（Recharts）等全部程式。
 * 拆開後登入頁只載入必要的程式，進入各頁時才下載該頁的程式碼。
 *
 * 把 import 函式獨立出來，是為了 preloadPages() 可以在瀏覽器空閒時預先下載，
 * 使用者切換頁面時通常已經下載好，不會看到載入畫面。
 */
import { lazy } from 'react'

const loaders = {
  Dashboard: () => import('../pages/Dashboard'),
  Products: () => import('../pages/products/ProductsPage'),
  Inventory: () => import('../pages/inventory/InventoryPage'),
  Purchase: () => import('../pages/purchase/PurchasePage'),
  PurchasePrint: () => import('../pages/purchase/PurchasePrintPage'),
  Sales: () => import('../pages/sales/SalesPage'),
  Settings: () => import('../pages/SettingsPage'),
  Testing: () => import('../pages/testing/ConcurrencyTestPage'),
}

export const Pages = {
  Dashboard: lazy(loaders.Dashboard),
  Products: lazy(loaders.Products),
  Inventory: lazy(loaders.Inventory),
  Purchase: lazy(loaders.Purchase),
  PurchasePrint: lazy(loaders.PurchasePrint),
  Sales: lazy(loaders.Sales),
  Settings: lazy(loaders.Settings),
  Testing: lazy(loaders.Testing),
}

/** 登入後在瀏覽器空閒時預先下載常用頁面（不影響目前頁面的互動） */
export function preloadPages(): void {
  const run = () => {
    for (const key of ['Products', 'Inventory', 'Sales', 'Purchase'] as const) void loaders[key]()
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
