import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '../ui'
import { percentChange } from '../../lib/format'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  /** 與上一期比較：傳入本期與上期數值，自動算出 ±% */
  compare?: { current: number; previous: number; label: string }
  /** 沒有比較基準時，改顯示一行補充說明 */
  hint?: string
}

/** 營收統計卡：數字＋與上一期的比較，讓老闆一眼知道「比之前好還是差」 */
export function StatCard({ label, value, icon, compare, hint }: StatCardProps) {
  const change = compare ? percentChange(compare.current, compare.previous) : null

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-3">{label}</p>
        <span className="hidden size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 sm:grid" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight text-ink tabular sm:text-2xl">{value}</p>

      <div className="mt-2 min-h-5 text-xs">
        {compare && change !== null && <ChangeLabel change={change} label={compare.label} />}
        {compare && change === null && <span className="text-ink-3">{compare.label}無資料可比較</span>}
        {!compare && hint && <span className="text-ink-3">{hint}</span>}
      </div>
    </Card>
  )
}

function ChangeLabel({ change, label }: { change: number; label: string }) {
  const up = change > 0
  const flat = change === 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const color = flat ? 'text-ink-3' : up ? 'text-emerald-700' : 'text-rose-600'

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="tabular">{up ? '+' : ''}{change}%</span>
      <span className="font-normal text-ink-3">比{label}</span>
    </span>
  )
}
