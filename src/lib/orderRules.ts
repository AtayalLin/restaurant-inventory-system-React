/**
 * 叫貨規則（純函式，有單元測試）
 * 參考連鎖餐飲門市訂貨系統常見規則：最低訂購量、供應商叫貨日、食材必須由該供應商供應
 * - 違反最低訂購量、供應商不符、重複食材 → 阻擋送出（後端也會檢查最低訂購量）
 * - 非叫貨日 → 只提醒不阻擋（臨時追加叫貨在實務上很常見）
 */
import type { Ingredient, Supplier } from '../types'
import type { IngredientPlan } from './forecast'

export const WEEKDAY_LABEL = ['日', '一', '二', '三', '四', '五', '六']

export interface PurchaseLine {
  ingredientId: string
  quantity: number
  unitPrice?: number
}

export interface LineIssue {
  index: number
  field: 'ingredientId' | 'quantity'
  message: string
}

/** 叫貨量不足最低訂購量時補到最低量 */
export function applyMinOrder(qty: number, minOrderQty = 0): number {
  return Math.max(qty, minOrderQty)
}

/** 檢查採購明細，回傳每一列的問題；空陣列代表可以送出 */
export function checkPurchaseLines(lines: PurchaseLine[], ingredients: Ingredient[], supplierId: string): LineIssue[] {
  const byId = new Map(ingredients.map(i => [i.id, i]))
  const seen = new Set<string>()
  const issues: LineIssue[] = []

  lines.forEach((line, index) => {
    const ing = byId.get(line.ingredientId)
    if (!ing) return // 尚未選擇食材，由表單必填驗證處理

    if (seen.has(ing.id)) {
      issues.push({ index, field: 'ingredientId', message: '同一食材重複，請合併成一列' })
    }
    seen.add(ing.id)

    if (supplierId && ing.supplierId && ing.supplierId !== supplierId) {
      issues.push({ index, field: 'ingredientId', message: '這項食材不是由此供應商供應' })
    }
    if (ing.minOrderQty && line.quantity < ing.minOrderQty) {
      issues.push({ index, field: 'quantity', message: `低於最低訂購量 ${ing.minOrderQty.toLocaleString('zh-TW')} ${ing.unit}` })
    }
  })
  return issues
}

/** 今天不是供應商的叫貨日時回傳提醒文字；每天都能叫貨則回傳 null */
export function orderDayNotice(supplier: Supplier | undefined, date = new Date()): string | null {
  const days = supplier?.orderDays ?? []
  if (!supplier || days.length === 0 || days.includes(date.getDay())) return null
  const sorted = [...days].sort((a, b) => a - b)
  // 下一個叫貨日：從明天開始往後找 7 天內最近的一天
  const next = Array.from({ length: 7 }, (_, i) => (date.getDay() + i + 1) % 7).find(d => sorted.includes(d))!
  const list = sorted.map(d => `週${WEEKDAY_LABEL[d]}`).join('、')
  return `今天不是「${supplier.name}」的叫貨日（${list}），下次叫貨日是週${WEEKDAY_LABEL[next]}；仍可送出臨時叫貨。`
}

export interface PurchaseDraft {
  supplierId: string
  supplierName: string
  items: Required<PurchaseLine>[]
}

/**
 * 把「明日預估」的叫貨建議依供應商分組成採購單草稿
 * 建議量會補到最低訂購量；沒有指定供應商的食材無法自動叫貨，略過
 */
export function draftsFromForecast(plans: IngredientPlan[], ingredients: Ingredient[], suppliers: Supplier[]): PurchaseDraft[] {
  const byId = new Map(ingredients.map(i => [i.id, i]))
  const drafts = new Map<string, PurchaseDraft>()

  for (const plan of plans) {
    if (plan.orderQty <= 0) continue
    const ing = byId.get(plan.ingredientId)
    if (!ing?.supplierId) continue
    const supplier = suppliers.find(s => s.id === ing.supplierId)
    if (!supplier) continue
    const draft = drafts.get(supplier.id) ?? { supplierId: supplier.id, supplierName: supplier.name, items: [] }
    draft.items.push({ ingredientId: ing.id, quantity: applyMinOrder(plan.orderQty, ing.minOrderQty), unitPrice: ing.costPerUnit })
    drafts.set(supplier.id, draft)
  }
  return [...drafts.values()]
}
