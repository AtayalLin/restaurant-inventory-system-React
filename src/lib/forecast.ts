/**
 * 需求預測與叫貨建議（純函式，不打 API，方便測試）
 *
 * 方法：「同星期平均」——餐廳生意有明顯的星期週期（週末比平日忙），
 * 所以預測明天時，取過去 N 週「同一個星期幾」的銷量平均，而不是單純取前幾天平均。
 * 這是零售與餐飲最常見的基準預測法，簡單、可解釋，數字由程式計算，AI 只負責說明。
 *
 * 流程：商品預估銷量 → 依配方換算食材用量 → 與現有庫存、安全庫存比較 → 建議叫貨量
 */
import type { Ingredient, Product, SalesOrder } from '../types'

export interface ProductForecast {
  productId: string
  name: string
  /** 預估份數（同星期平均，取到小數一位） */
  quantity: number
}

export interface IngredientPlan {
  ingredientId: string
  name: string
  unit: string
  /** 預估明日用量 */
  usage: number
  currentStock: number
  safetyStock: number
  /** 明日營業結束後預估剩餘庫存 */
  projectedStock: number
  /** 建議叫貨量：讓營業結束後仍保有安全庫存；0 代表不需叫貨 */
  orderQty: number
}

export interface ForecastResult {
  targetDate: Date
  /** 實際有資料的週數（新開店資料不足 N 週時會較少） */
  weeksUsed: number
  products: ProductForecast[]
  ingredients: IngredientPlan[]
}

const DAY_MS = 86_400_000

/** 叫貨量進位單位：g／ml 以 100 為單位，其餘（顆、片）以 1 為單位，比較接近實際叫貨 */
function roundUpOrder(qty: number, unit: string): number {
  if (qty <= 0) return 0
  const step = unit === 'g' || unit === 'ml' ? 100 : 1
  return Math.ceil(qty / step) * step
}

/** 當地時間的日期字串（YYYY-M-D），用來把訂單歸到同一天 */
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/**
 * 預估 targetDate 當天各商品銷量
 * @param weeks 往回看幾週的同星期資料，預設 4 週
 */
export function forecastProducts(
  orders: SalesOrder[], products: Product[], targetDate: Date, weeks = 4,
): { products: ProductForecast[]; weeksUsed: number } {
  // 要參考的日期：targetDate 往前 7、14、21、28 天
  const refDays = new Set(Array.from({ length: weeks }, (_, i) => dayKey(new Date(targetDate.getTime() - (i + 1) * 7 * DAY_MS))))

  const totals = new Map<string, number>()
  const daysWithSales = new Set<string>()
  for (const o of orders) {
    if (o.status !== 'COMPLETED') continue // 退款、未完成的不算真實需求
    const key = dayKey(new Date(o.createdAt))
    if (!refDays.has(key)) continue
    daysWithSales.add(key)
    for (const item of o.items) totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity)
  }

  const weeksUsed = daysWithSales.size
  if (weeksUsed === 0) return { products: [], weeksUsed: 0 }

  const nameOf = new Map(products.map(p => [p.id, p.name]))
  const result = [...totals]
    .filter(([id]) => products.find(p => p.id === id)?.isActive !== false) // 已下架商品明天不會賣
    .map(([productId, qty]) => ({
      productId,
      name: nameOf.get(productId) ?? productId,
      quantity: Math.round((qty / weeksUsed) * 10) / 10,
    }))
    .sort((a, b) => b.quantity - a.quantity)

  return { products: result, weeksUsed }
}

/** 依配方把商品預估銷量換算成食材用量，並算出建議叫貨量（需叫貨的排前面） */
export function planIngredients(
  forecasts: ProductForecast[], products: Product[], ingredients: Ingredient[],
): IngredientPlan[] {
  const usage = new Map<string, number>()
  const productMap = new Map(products.map(p => [p.id, p]))
  for (const f of forecasts) {
    for (const r of productMap.get(f.productId)?.recipe ?? []) {
      usage.set(r.ingredientId, (usage.get(r.ingredientId) ?? 0) + r.quantity * f.quantity)
    }
  }

  return ingredients
    .filter(ing => usage.has(ing.id))
    .map(ing => {
      const use = Math.ceil(usage.get(ing.id)!) // 用量無條件進位，寧可多備一點
      const projectedStock = ing.currentStock - use
      return {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        usage: use,
        currentStock: ing.currentStock,
        safetyStock: ing.safetyStock,
        projectedStock,
        orderQty: roundUpOrder(ing.safetyStock - projectedStock, ing.unit),
      }
    })
    .sort((a, b) => b.orderQty - a.orderQty || a.projectedStock / a.safetyStock - b.projectedStock / b.safetyStock)
}

/** 預測「明天」：組合上面兩步 */
export function forecastTomorrow(
  orders: SalesOrder[], products: Product[], ingredients: Ingredient[], now = new Date(), weeks = 4,
): ForecastResult {
  const targetDate = new Date(now)
  targetDate.setHours(12, 0, 0, 0) // 用中午避免日光節約或時區邊界造成跨日誤差
  targetDate.setDate(targetDate.getDate() + 1)
  const { products: productForecasts, weeksUsed } = forecastProducts(orders, products, targetDate, weeks)
  return {
    targetDate,
    weeksUsed,
    products: productForecasts,
    ingredients: planIngredients(productForecasts, products, ingredients),
  }
}
