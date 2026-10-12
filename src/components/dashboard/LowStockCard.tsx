import { AlertTriangle, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, Badge, Button, EmptyState } from '../ui'
import { useRestockSuggestion } from '../../hooks/useRestockSuggestion'
import type { LowStockItem } from '../../hooks/useDashboard'

/** 低庫存警示＋Agent A AI 補貨建議 */
export function LowStockCard({ items }: { items: LowStockItem[] }) {
  const restock = useRestockSuggestion()

  const handleRestock = () => {
    restock.mutate({
      ingredients: items.map(item => ({
        name: item.name,
        currentStock: item.currentStock,
        safetyStock: item.safetyStock,
        unit: item.unit,
        shortage: item.shortage,
      })),
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<AlertTriangle size={18} className="text-rose-500" aria-hidden="true" />}
        title="低庫存警示"
        description="現有庫存低於安全庫存的食材"
        aside={items.length > 0 ? <Badge tone="danger">{items.length} 項</Badge> : undefined}
      />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {items.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={20} />} title="庫存都在安全水位以上" className="flex-1" />
        ) : (
          <>
            <ul className="space-y-4">
              {items.map(item => {
                // 進度條：現有庫存佔安全庫存的比例，越短代表越缺
                const ratio = Math.max(0, Math.min(100, (item.currentStock / item.safetyStock) * 100))
                return (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">{item.name}</span>
                      <span className="text-xs text-ink-3 tabular">
                        {item.currentStock.toLocaleString()} / {item.safetyStock.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar" aria-valuenow={Math.round(ratio)} aria-valuemin={0} aria-valuemax={100}
                      aria-label={`${item.name} 庫存達安全庫存的 ${Math.round(ratio)}%`}>
                      <div className={`h-full rounded-full ${ratio < 50 ? 'bg-rose-500' : 'bg-amber-400'}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-rose-600 tabular">缺 {item.shortage.toLocaleString()} {item.unit}</p>
                  </li>
                )
              })}
            </ul>

            <div className="mt-auto pt-5">
              <Button variant="ai" className="w-full" onClick={handleRestock} loading={restock.isPending}
                icon={<Sparkles size={16} aria-hidden="true" />}>
                {restock.isPending ? 'AI 分析中' : 'AI 補貨建議'}
              </Button>

              <div aria-live="polite">
                {restock.isError && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle size={16} aria-hidden="true" />
                    AI 建議服務暫時無法使用，請確認 n8n 已啟動
                  </p>
                )}
                {restock.isSuccess && (
                  <div className="mt-3 rounded-xl border border-ai-100 bg-ai-50/60 p-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ai-700">
                      <Sparkles size={13} aria-hidden="true" />AI 補貨建議
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{restock.data.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
