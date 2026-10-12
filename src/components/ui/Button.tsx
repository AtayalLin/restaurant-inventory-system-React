import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ai' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  /** 載入中：顯示轉圈並停用按鈕，避免重複送出 */
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-200',
  secondary: 'border border-line bg-white text-ink-2 hover:bg-slate-50 hover:text-ink focus-visible:ring-brand-100',
  ai:        'bg-ai-600 text-white hover:bg-ai-700 focus-visible:ring-ai-200',
  danger:    'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-100',
  ghost:     'text-ink-2 hover:bg-slate-100 hover:text-ink focus-visible:ring-brand-100',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

/** 全站共用按鈕：用 variant 區分用途，不再每頁各自寫一套顏色 */
export function Button({
  variant = 'primary', size = 'md', icon, loading = false,
  className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      ) : icon}
      {children}
    </button>
  )
}
