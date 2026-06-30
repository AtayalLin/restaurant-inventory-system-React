import { useMemo } from 'react'
import { useProducts } from './useProducts'
import { useIngredients } from './useIngredients'
import { useSalesOrders } from './useSalesOrders'
// 重用三個現有 hook，各自負責資料抓取，這裡只做衍生計算
// 關聯：src/pages/Dashboard.tsx 會呼叫這個 hook 取得所有畫面所需資料

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

// ==========================================
// 主 Hook
// ==========================================

export function useDashboard() {
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: ingredients = [], isLoading: ingredientsLoading } = useIngredients()
  const { data: salesOrders = [], isLoading: salesLoading } = useSalesOrders()

  const isLoading = productsLoading || ingredientsLoading || salesLoading

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
      .filter(ing => ing.expiryDays !== null && ing.expiryDays <= 7)
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

    completedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= todayStart) todayRevenue += order.total
      if (orderDate >= weekStart) weekRevenue += order.total
      if (orderDate >= monthStart) monthRevenue += order.total
    })

    const orderCount = completedOrders.length
    const avgOrderValue = orderCount > 0
      ? Math.round(completedOrders.reduce((sum, o) => sum + o.total, 0) / orderCount)
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
    lowStockItems,
    expiryWarnings,
    productMargins,
    revenueStats,
    dailyTrend,
  }
}