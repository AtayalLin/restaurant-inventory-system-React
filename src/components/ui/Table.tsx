import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

interface DataTableProps {
  headers: string[]
  children: ReactNode
  /** 表格最小寬度：手機上超過螢幕時在卡片內橫向捲動，不撐破整頁 */
  minWidth?: number
}

/** 列表頁共用表格外框：卡片樣式＋表頭；資料列由各頁面自己渲染 */
export function DataTable({ headers, children, minWidth = 720 }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-canvas">
            {headers.map(h => (
              <th key={h} scope="col" className="px-4 py-3 text-left text-[13px] font-medium text-ink-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

/** 表格內「沒有資料」的整列 */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-ink-3">{children}</td>
    </tr>
  )
}

/** 列表載入中的骨架：標題列＋幾列灰色條，版面不會在資料到達時跳動 */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="載入中">
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-24" />
      <Skeleton className="mb-4 h-10 w-full" />
      <div className="space-y-2 rounded-[var(--radius-card)] border border-line bg-white p-4">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
    </div>
  )
}
