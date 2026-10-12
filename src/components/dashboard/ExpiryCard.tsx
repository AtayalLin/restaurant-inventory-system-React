import { Clock, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, Badge, EmptyState } from '../ui'
import type { ExpiryWarningItem } from '../../hooks/useDashboard'

/** 即期食材：3 天內標紅色，其餘標黃色 */
export function ExpiryCard({ items }: { items: ExpiryWarningItem[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<Clock size={18} className="text-amber-500" aria-hidden="true" />}
        title="即期食材"
        description="保存期限 7 天內，建議優先使用"
        aside={items.length > 0 ? <Badge tone="warning">{items.length} 項</Badge> : undefined}
      />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        {items.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={20} />} title="沒有即將到期的食材" className="flex-1" />
        ) : (
          <ul className="divide-y divide-line">
            {items.map(item => {
              const urgent = (item.expiryDays ?? 99) <= 3
              return (
                <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2.5 font-medium text-ink">
                    <span className={`size-2 rounded-full ${urgent ? 'bg-rose-500' : 'bg-amber-400'}`} aria-hidden="true" />
                    {item.name}
                  </span>
                  <Badge tone={urgent ? 'danger' : 'warning'}>剩 {item.expiryDays} 天</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
