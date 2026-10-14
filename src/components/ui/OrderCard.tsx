import type { ReactNode } from 'react'

interface OrderLine { key: string; name: string; detail: string }

interface OrderCardProps {
  /** 左上：主要標題列（供應商名稱或用餐方式＋狀態徽章） */
  title: ReactNode
  /** 左上第二行：日期等次要資訊 */
  meta: ReactNode
  /** 右上：金額 */
  amount: string
  amountHint?: ReactNode
  lines: OrderLine[]
  note?: string
  /** 右下：可執行的操作按鈕 */
  actions?: ReactNode
}

/** 採購單與銷售訂單共用的卡片版面：上方摘要、中間品項明細、下方備註與操作 */
export function OrderCard({ title, meta, amount, amountHint, lines, note, actions }: OrderCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">{title}</div>
          <div className="text-xs text-ink-3">{meta}</div>
        </div>
        <div className="text-right">
          <div className="tabular text-lg font-bold text-brand-800">{amount}</div>
          {amountHint && <div className="tabular text-xs text-ink-3">{amountHint}</div>}
        </div>
      </div>

      <ul className="mb-3 divide-y divide-line rounded-lg bg-canvas px-3">
        {lines.map(l => (
          <li key={l.key} className="flex flex-wrap justify-between gap-2 py-2 text-[13px]">
            <span className="text-ink">{l.name}</span>
            <span className="tabular text-ink-2">{l.detail}</span>
          </li>
        ))}
      </ul>

      {note && <p className="mb-3 text-[13px] text-ink-3">備註：{note}</p>}
      {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </article>
  )
}
