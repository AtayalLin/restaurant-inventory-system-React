import { BarChart3 } from 'lucide-react'
import { Card, CardHeader } from '../ui'
import { formatCurrency } from '../../lib/format'
import type { ProductMargin } from '../../hooks/useDashboard'

/** 毛利率分級：餐飲業一般以 60% 以上為健康 */
function marginTone(margin: number) {
  if (margin >= 60) return { bar: 'bg-emerald-500', text: 'text-emerald-700' }
  if (margin >= 40) return { bar: 'bg-amber-400', text: 'text-amber-700' }
  return { bar: 'bg-rose-500', text: 'text-rose-600' }
}

export function MarginTable({ items }: { items: ProductMargin[] }) {
  return (
    <Card>
      <CardHeader
        icon={<BarChart3 size={18} className="text-brand-600" aria-hidden="true" />}
        title="商品毛利率排行"
        description="依食譜計算食材成本，售價為未稅價"
      />
      <div className="overflow-x-auto px-5 pb-4 pt-3">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-3">
              <th className="py-2.5 font-medium">商品</th>
              <th className="py-2.5 text-right font-medium">售價</th>
              <th className="py-2.5 text-right font-medium">食材成本</th>
              <th className="w-[38%] py-2.5 pl-6 font-medium">毛利率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p, i) => {
              const tone = marginTone(p.margin)
              return (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3">
                    <span className="mr-2 inline-grid size-5 place-items-center rounded bg-slate-100 text-[11px] font-semibold text-ink-3 tabular">{i + 1}</span>
                    <span className="font-medium text-ink">{p.name}</span>
                  </td>
                  <td className="py-3 text-right text-ink tabular">{formatCurrency(p.price)}</td>
                  <td className="py-3 text-right text-ink-3 tabular">{formatCurrency(p.cost)}</td>
                  <td className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, p.margin))}%` }} />
                      </div>
                      <span className={`w-14 text-right font-semibold tabular ${tone.text}`}>{p.margin}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
