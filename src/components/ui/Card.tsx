import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

/** 所有區塊的外框：統一圓角、陰影、白底 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </section>
  )
}

interface CardHeaderProps {
  icon?: ReactNode
  title: string
  /** 標題右側的數量徽章或操作按鈕 */
  aside?: ReactNode
  description?: string
}

/** 區塊標題列：圖示＋標題＋右側附加資訊 */
export function CardHeader({ icon, title, aside, description }: CardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {icon}
          {title}
        </h3>
        {description && <p className="mt-1 text-xs text-ink-3">{description}</p>}
      </div>
      {aside}
    </header>
  )
}
