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
 * 1. ~~API 端點寫死在各 hook 檔案裡~~（已完成：集中於 src/lib/config.ts，可用 .env 覆寫）
 *
 * 2. ~~Dashboard.tsx 檔案過大~~（已完成：拆成 src/components/dashboard/ 與 src/components/ui/）
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
  // 【新增】比較基準：讓儀表板可以顯示「比上一期 ±%」，數字才有意義
  yesterdayRevenue: number   // 昨日全天營收（對照今日）
  prevWeekRevenue: number    // 前一個 7 天區間營收（對照本週）
  prevMonthRevenue: number   // 上個月「同期」營收：上月 1 號到上月的今天（對照本月至今）
  todayOrderCount: number    // 今日完成訂單數
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
    dataUpdatedAt: productsUpdatedAt,
  } = useProducts(autoRefreshOptions)

  const {
    data: ingredients = [],
    isLoading: ingredientsLoading,
    isError: ingredientsError,
    dataUpdatedAt: ingredientsUpdatedAt,
  } = useIngredients(autoRefreshOptions)

  const {
    data: salesOrders = [],
    isLoading: salesLoading,
    isError: salesError,
    dataUpdatedAt: salesUpdatedAt,
  } = useSalesOrders(autoRefreshOptions)

  // 【新增】最後更新時間：取三個資料來源中最新的一次，顯示在儀表板標題旁
  const updatedAt = Math.max(productsUpdatedAt, ingredientsUpdatedAt, salesUpdatedAt)

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
    // 近 7 天＝今天往前推 6 天（含今天共 7 天），與下方「近 7 天銷售趨勢」圖表的區間一致
    // 【修正】原本減 7 天，實際涵蓋 8 天，導致統計卡和趨勢圖的 7 天合計對不起來
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 6)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 比較區間：與本期等長、緊接在本期之前
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    // 上月同期的結束點：上個月的「今天此刻」，月底日期不存在時自動落在上月最後一天
    const prevMonthSameDay = new Date(prevMonthStart)
    prevMonthSameDay.setDate(Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()))
    prevMonthSameDay.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

    let todayRevenue = 0
    let weekRevenue = 0
    let monthRevenue = 0
    let yesterdayRevenue = 0
    let prevWeekRevenue = 0
    let prevMonthRevenue = 0
    let todayOrderCount = 0
    let totalRevenue = 0 // 新增：在同一次迴圈裡順便累加全部已完成訂單的總營收，用來算平均客單價

    completedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= todayStart) { todayRevenue += order.total; todayOrderCount++ }
      else if (orderDate >= yesterdayStart) yesterdayRevenue += order.total
      if (orderDate >= weekStart) weekRevenue += order.total
      else if (orderDate >= prevWeekStart) prevWeekRevenue += order.total
      if (orderDate >= monthStart) monthRevenue += order.total
      else if (orderDate >= prevMonthStart && orderDate <= prevMonthSameDay) prevMonthRevenue += order.total
      totalRevenue += order.total
    })

    const orderCount = completedOrders.length
    const avgOrderValue = orderCount > 0
      ? Math.round(totalRevenue / orderCount)
      : 0

    return {
      todayRevenue, weekRevenue, monthRevenue, orderCount, avgOrderValue,
      yesterdayRevenue, prevWeekRevenue, prevMonthRevenue, todayOrderCount,
    }
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
    updatedAt,
  }
}