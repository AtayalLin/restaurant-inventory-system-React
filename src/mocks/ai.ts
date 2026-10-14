/**
 * Demo 模式的 AI 模擬回應
 *
 * 線上 Demo 不能放 NVIDIA 金鑰（放了任何人都看得到），也沒有 n8n 可以呼叫，
 * 所以這三個 AI 功能在 Demo 裡改成「規則產生的回應」：
 * - 查詢助理：沿用正式版「程式算數字、AI 只負責講話」的設計，數字一樣由程式從資料計算，
 *   只是把 AI 判斷意圖換成關鍵字比對、把 AI 組句換成固定句型。
 * - 補貨建議、菜單文案：用範本產生，並在畫面上標示為 Demo 範例。
 * 想看真正的 AI 回應，請在本機依 README 啟動 n8n 與 NVIDIA NIM。
 */
import { db } from './db'
import type { QueryResponse } from '../types/query'
import type { LowStockPayload, RestockSuggestionResponse } from '../hooks/useRestockSuggestion'

const DEMO_NOTE = '（Demo 範例回應，本機版由 NVIDIA NIM 產生）'

const money = (n: number) => `NT$${Math.round(n).toLocaleString('zh-TW')}`

function completedBetween(from: Date, to: Date) {
  return db.salesOrders.filter(o => {
    if (o.status !== 'COMPLETED') return false
    const t = new Date(o.createdAt)
    return t >= from && t < to
  })
}

function startOfDay(d: Date, offsetDays = 0) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + offsetDays)
  return t
}

function changeText(current: number, previous: number) {
  if (previous === 0) return '上一期沒有營收資料可比較'
  const pct = ((current - previous) / previous) * 100
  const dir = pct >= 0 ? '成長' : '減少'
  return `比上一期（${money(previous)}）${dir} ${Math.abs(pct).toFixed(1)}%`
}

function revenueAnswer(question: string): QueryResponse {
  const now = new Date()
  const sum = (from: Date, to: Date) => completedBetween(from, to).reduce((s, o) => s + o.total, 0)

  if (/月/.test(question)) {
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastSameDay = new Date(lastStart)
    lastSameDay.setDate(Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()))
    lastSameDay.setHours(now.getHours(), now.getMinutes())
    const current = sum(thisStart, now)
    const previous = sum(lastStart, lastSameDay)
    return {
      intent: 'REVENUE_COMPARISON',
      answer: `本月到目前為止的營收是 ${money(current)}，${changeText(current, previous)}。${DEMO_NOTE}`,
      data: { current, previous, period: 'month' },
    }
  }

  const end = startOfDay(now, 1)
  const current = sum(startOfDay(now, -6), end)
  const previous = sum(startOfDay(now, -13), startOfDay(now, -6))
  return {
    intent: 'REVENUE_COMPARISON',
    answer: `近 7 天營收是 ${money(current)}，${changeText(current, previous)}。${DEMO_NOTE}`,
    data: { current, previous, period: 'week' },
  }
}

function topSellingAnswer(): QueryResponse {
  const now = new Date()
  const orders = completedBetween(startOfDay(now, -6), startOfDay(now, 1))
  const stats = new Map<string, { qty: number; revenue: number }>()
  for (const o of orders) {
    for (const i of o.items) {
      const s = stats.get(i.productId) ?? { qty: 0, revenue: 0 }
      s.qty += i.quantity
      s.revenue += i.quantity * i.unitPrice
      stats.set(i.productId, s)
    }
  }
  const nameOf = new Map(db.products.map(p => [p.id, p.name]))
  const ranking = [...stats]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 3)
    .map(([id, s]) => ({ name: nameOf.get(id) ?? id, ...s }))

  if (ranking.length === 0) {
    return { intent: 'TOP_SELLING_PRODUCTS', answer: `近 7 天還沒有完成的訂單。${DEMO_NOTE}` }
  }
  const lines = ranking.map((r, i) => `${i + 1}. ${r.name}：${r.qty} 份，營收 ${money(r.revenue)}`).join('\n')
  return {
    intent: 'TOP_SELLING_PRODUCTS',
    answer: `近 7 天銷量前 ${ranking.length} 名：\n${lines}\n${DEMO_NOTE}`,
    data: { ranking },
  }
}

export function answerQuestion(question: string): QueryResponse {
  if (/排行|熱銷|賣最好|最好賣|賣得最好|銷量|前三|前幾名|最受歡迎/.test(question)) return topSellingAnswer()
  if (/營收|營業額|收入|賺|業績/.test(question)) return revenueAnswer(question)
  return {
    intent: 'UNKNOWN',
    answer: '目前可以回答「營收比較」與「銷售排行」兩類問題，例如：「本週營收多少？」「這個月營收跟上個月比如何？」「最近哪個商品賣最好？」',
  }
}

export function restockSuggestion(payload: LowStockPayload): RestockSuggestionResponse {
  if (payload.ingredients.length === 0) {
    return { suggestion: `目前沒有低於安全庫存的食材。${DEMO_NOTE}`, tokensUsed: 0 }
  }
  const lines = payload.ingredients.map(ing => {
    // 補到安全庫存的 1.5 倍，再取整數，讓建議量比較像實際叫貨的數字
    const target = ing.safetyStock * 1.5 - ing.currentStock
    const step = ing.unit === 'g' || ing.unit === 'ml' ? 500 : 10
    const qty = Math.max(step, Math.ceil(target / step) * step)
    const ratio = ing.currentStock / ing.safetyStock
    const reason = ratio < 0.5
      ? '庫存已不到安全量的一半，建議今天就叫貨'
      : '庫存低於安全量，建議在下次進貨時一併補足'
    return `・${ing.name}：建議補貨 ${qty.toLocaleString('zh-TW')} ${ing.unit}，${reason}`
  })
  return { suggestion: `${lines.join('\n')}\n${DEMO_NOTE}`, tokensUsed: 0 }
}

/** 從菜單文案的 prompt 取出分類，產生範本文案（依 prompt 要求，不以商品名稱開頭） */
export function productCopy(prompt: string): string {
  const category = /分類：(.+)/.exec(prompt)?.[1]?.trim() ?? ''
  const templates: Record<string, string> = {
    '飲料': `嚴選茶葉現泡，口感清爽順口，冰涼一口直達心底，是正餐後最剛好的收尾。`,
    '小菜': `每日現做、份量剛好，簡單調味帶出食材原味，是配飯配麵都不能少的好夥伴。`,
  }
  const body = templates[category]
    ?? `選用當日新鮮食材，火候與調味都經過反覆調整，每一口都吃得到用心，是老客人回訪必點的一道。`
  return `${body}${DEMO_NOTE}`
}
