import { useMemo } from 'react'
import { Store as StoreIcon } from 'lucide-react'
import { Card, CardHeader } from '../ui'
import { revenueByStore } from '../../lib/permissions'
import { formatCurrency } from '../../lib/format'
import type { SalesOrder, Store } from '../../types'

/** 跨店比較（總部專用）：近 7 天各門市營收、訂單數與佔比 */
export function StoreCompareCard({ orders, stores }: { orders: SalesOrder[]; stores: Store[] }) {
  const rows = useMemo(() => {
    const to = new Date()
    to.setHours(24, 0, 0, 0) // 明天 0 點，包含今天整天
    const from = new Date(to.getTime() - 7 * 86_400_000)
    return revenueByStore(orders, stores, from, to)
  }, [orders, stores])
  const total = rows.reduce((s, r) => s + r.revenue, 0)

  return (
    <Card>
      <CardHeader
        icon={<StoreIcon size={18} className="text-brand-600" aria-hidden="true" />}
        title="門市營收比較"
        description="近 7 天已完成訂單"
      />
      <ul className="grid gap-4 px-5 pb-5 pt-4 sm:grid-cols-2">
        {rows.map(r => {
          const share = total > 0 ? Math.round((r.revenue / total) * 100) : 0
          return (
            <li key={r.storeId}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{r.name}</span>
                <span className="tabular text-sm text-ink-2">
                  <strong className="text-base text-ink">{formatCurrency(r.revenue)}</strong>・{r.orders} 筆・{share}%
                </span>
              </div>
              {/* 營收佔比長條；role="meter" 讓螢幕閱讀器讀出百分比 */}
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} 營收佔比`}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${share}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
