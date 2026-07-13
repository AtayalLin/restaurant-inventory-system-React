import { useMemo } from 'react'
import { useProducts } from './useProducts'
import { useIngredients } from './useIngredients'
import { useSalesOrders } from './useSalesOrders'
// 重用三個現有 hook 拿到的 queryKey 結構一致，這裡額外疊加 refetchInterval
// 為什麼不直接改 useProducts.ts 等共用 hook：
//   InventoryPage、ProductsPage 等其他頁面也在用同一批 hook
//   全站套用 30 秒輪詢會增加不必要的網路請求，只有 Dashboard 需要自動更新
// 關聯：src/pages/Dashboard.tsx 會呼叫這個 hook 取得所有畫面所需資料


/**
 * 已知技術債清單（依優先度排序，供之後有空時處理）：
 *
 * 1. API 端點目前寫死在各 hook 檔案裡（BASE = '/api'、N8N_RESTOCK_URL 等）。
 *    正式部署到不同環境（開發/正式）時，這些應該搬進 .env 用環境變數管理。
 *
 * 2. Dashboard.tsx 檔案過大（150+ 行），混雜了統計卡片、圖表、低庫存卡片、
 *    毛利表格等多個職責，建議拆成 src/components/dashboard/ 底下的獨立元件。
 *
 * 3. useDashboard.ts 的到期警告門檻寫死 7 天（EXPIRY_WARNING_DAYS 常數），
 *    但 types/index.ts 的 SystemSettings 已經定義了 expiryWarningDays 欄位，
 *    之後串接 SettingsPage.tsx 讓使用者可自訂門檻時，這裡要改成讀取該設定值。
 *
 * 4. isError 判斷目前是「三個資料來源任一個失敗就整體算失敗」，
 *    無法讓使用者知道具體是哪個 API 出錯，之後可以考慮分開暴露。
 */

// ==========================================
// 型別定義（衍生資料，不是後端原始資料）
// ==========================================

export interface LowStockItem {
  id: string
  name: string
  currentStock: number
  safetyStock: number
  unit: string
  shortage: number
}

export interface ExpiryWarningItem {
  id: string
  name: string
  expiryDays: number | null
}

export interface ProductMargin {
  id: string
  name: string
  price: number
  cost: number
  margin: number
}

export interface RevenueStats {
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  orderCount: number
  avgOrderValue: number
}

export interface DailyTrend {
  date: string
  revenue: number
}

// 到期警告的門檻天數
// TODO: 目前寫死 7 天，但 types/index.ts 的 SystemSettings 已經定義了 expiryWarningDays 欄位，
//   之後串接 SettingsPage.tsx 讓使用者可以自訂門檻時，這裡應該改成讀取該設定值，
//   而不是繼續寫死常數。先抽成獨立常數，之後要替換成動態值時，只要改這一行的來源即可。
const EXPIRY_WARNING_DAYS = 7

// ==========================================
// 主 Hook
// ==========================================

export function useDashboard() {

  // ── 自動更新設定 ──────────────────────────────────────────
  // refetchInterval：每 30 秒自動重新抓取一次，數字變動會自動反映
  // refetchOnWindowFocus：TanStack Query 預設行為，切回分頁時自動重抓一次
  //   涵蓋「老闆切去別的分頁操作銷售，再切回 Dashboard」這種情境
  // 為什麼選 30 秒而非更短：Dashboard 是給人看趨勢的頁面，不需要秒級更新
  //   太頻繁的輪詢會增加 json-server 負擔，30 秒是顯示即時感和效能的平衡點
  const autoRefreshOptions = {
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  }

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useProducts(autoRefreshOptions)

  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    isError: ingredientsError,
  } = useIngredients(autoRefreshOptions)

  const {
    data: salesOrders = [],
    isLoading: salesLoading,
    isError: salesError,
  } = useSalesOrders(autoRefreshOptions)

  const isLoading = productsLoading || ingredientsLoading || salesLoading

  // 【本次修正】原本完全沒有暴露 isError：
  //   如果任一個 API 呼叫失敗，data 會 fallback 成空陣列 []，
  //   Dashboard 畫面會安靜地顯示「營收 NT$0、庫存全部正常」，
  //   對餐飲老闆來說，這種「看起來一切正常但其實是資料沒抓到」的狀況比直接顯示錯誤更危險，
  //   容易被誤判成「今天真的沒生意」而不是「系統掛了」。
  //   現在把三個來源的 isError 彙整成一個旗標，交給 Dashboard.tsx 判斷要不要顯示錯誤提示。
  const isError = productsError || ingredientsError || salesError

  // ── 低庫存清單 ──────────────────────────────────────────
  const lowStockItems = useMemo<LowStockItem[]>(() => {
    return ingredients
      .filter(ing => ing.currentStock < ing.safetyStock)
      .map(ing => ({
        id: ing.id,
        name: ing.name,
        currentStock: ing.currentStock,
        safetyStock: ing.safetyStock,
        unit: ing.unit,
        shortage: ing.safetyStock - ing.currentStock,
      }))
      .sort((a, b) => b.shortage - a.shortage)
  }, [ingredients])

  // ── 到期警告清單 ────────────────────────────────────────
  const expiryWarnings = useMemo<ExpiryWarningItem[]>(() => {
    return ingredients
      .filter(ing => ing.expiryDays !== null && ing.expiryDays <= EXPIRY_WARNING_DAYS)
      .map(ing => ({
        id: ing.id,
        name: ing.name,
        expiryDays: ing.expiryDays,
      }))
      .sort((a, b) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
  }, [ingredients])

  // ── 商品毛利率排行 ──────────────────────────────────────
  const productMargins = useMemo<ProductMargin[]>(() => {
    const ingredientMap = new Map(ingredients.map(ing => [ing.id, ing]))

    return products
      .filter(p => p.isActive)
      .map(product => {
        const cost = product.recipe.reduce((sum, item) => {
          const ingredient = ingredientMap.get(item.ingredientId)
          if (!ingredient) return sum
          return sum + ingredient.costPerUnit * item.quantity
        }, 0)

        const margin = product.price > 0
          ? ((product.price - cost) / product.price) * 100
          : 0

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          cost: Math.round(cost * 100) / 100,
          margin: Math.round(margin * 10) / 10,
        }
      })
      .sort((a, b) => b.margin - a.margin)
  }, [products, ingredients])

  // ── 營收統計 ────────────────────────────────────────────
  // 【本次修正】原本這裡跑了兩次迴圈算同一批 completedOrders：
  //   第一次 forEach 算 today/week/month revenue，
  //   第二次又用 reduce 重新加總一次算 avgOrderValue 要用的總營收。
  //   資料量小的時候感覺不出差異，但這是「多跑一次陣列」的浪費，
  //   兩次迴圈合併成一次，在第一次 forEach 裡順便累加 totalRevenue。
  const revenueStats = useMemo<RevenueStats>(() => {
    const completedOrders = salesOrders.filter(o => o.status === 'COMPLETED')

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayRevenue = 0
    let weekRevenue = 0
    let monthRevenue = 0
    let totalRevenue = 0 // 新增：在同一次迴圈裡順便累加全部已完成訂單的總營收，用來算平均客單價

    completedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= todayStart) todayRevenue += order.total
      if (orderDate >= weekStart) weekRevenue += order.total
      if (orderDate >= monthStart) monthRevenue += order.total
      totalRevenue += order.total
    })

    const orderCount = completedOrders.length
    const avgOrderValue = orderCount > 0
      ? Math.round(totalRevenue / orderCount)
      : 0

    return { todayRevenue, weekRevenue, monthRevenue, orderCount, avgOrderValue }
  }, [salesOrders])

  // ── 近 7 天銷售趨勢 ──────────────────────────────────────
  const dailyTrend = useMemo<DailyTrend[]>(() => {
    const completedOrders = salesOrders.filter(o => o.status === 'COMPLETED')

    const days: DailyTrend[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        revenue: 0,
      })
    }

    completedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const label = `${orderDate.getMonth() + 1}/${orderDate.getDate()}`
      const dayEntry = days.find(d => d.date === label)
      if (dayEntry) dayEntry.revenue += order.total
    })

    return days
  }, [salesOrders])

  return {
    isLoading,
    isError, // 新增：暴露給 Dashboard.tsx 判斷要不要顯示錯誤狀態
    lowStockItems,
    expiryWarnings,
    productMargins,
    revenueStats,
    dailyTrend,
  }
}