import { CalendarClock, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card, CardHeader, Badge, EmptyState } from '../ui'
import type { ForecastResult } from '../../lib/forecast'

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']
const fmt = (n: number) => n.toLocaleString('zh-TW')

/**
 * 明日預估：上方是預估銷量前 3 名商品，下方是依配方換算的叫貨建議
 * 只列出「需要叫貨」的食材，庫存足夠的不佔版面
 */
export function ForecastCard({ forecast }: { forecast: ForecastResult }) {
  const { targetDate, weeksUsed, products, ingredients } = forecast
  const toOrder = ingredients.filter(i => i.orderQty > 0)
  const label = `${targetDate.getMonth() + 1}/${targetDate.getDate()}（${WEEKDAY[targetDate.getDay()]}）`

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<CalendarClock size={18} className="text-brand-600" aria-hidden="true" />}
        title={`明日預估 ${label}`}
        description={weeksUsed > 0 ? `依過去 ${weeksUsed} 週同星期的平均銷量推估` : '累積一週以上的銷售資料後即可預估'}
        aside={toOrder.length > 0 ? <Badge tone="brand">{toOrder.length} 項待叫貨</Badge> : undefined}
      />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        {weeksUsed === 0 ? (
          <EmptyState icon={<TrendingUp size={20} />} title="歷史資料不足" className="flex-1" />
        ) : (
          <>
            {/* 預估熱賣商品 */}
            <ul className="mb-4 flex flex-wrap gap-2" aria-label="預估銷量前三名">
              {products.slice(0, 3).map(p => (
                <li key={p.productId} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
                  {p.name} <span className="tabular font-semibold">約 {Math.round(p.quantity)} 份</span>
                </li>
              ))}
            </ul>

            {toOrder.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={20} />} title="現有庫存足夠明日營業" className="flex-1" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th scope="col" className="pb-2 font-medium">食材</th>
                    <th scope="col" className="pb-2 text-right font-medium">預估用量</th>
                    <th scope="col" className="pb-2 text-right font-medium">建議叫貨</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {toOrder.slice(0, 5).map(i => (
                    <tr key={i.ingredientId}>
                      <td className="py-2.5 font-medium text-ink">
                        {i.name}
                        {/* 營業中就會用完：提醒今天就要叫貨 */}
                        {i.projectedStock < 0 && <span className="ml-1.5 text-xs font-normal text-rose-600">會缺貨</span>}
                      </td>
                      <td className="tabular py-2.5 text-right text-ink-2">{fmt(i.usage)} {i.unit}</td>
                      <td className="tabular py-2.5 text-right font-semibold text-brand-700">{fmt(i.orderQty)} {i.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
