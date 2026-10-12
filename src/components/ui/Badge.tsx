import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'ai' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger:  'bg-rose-50 text-rose-700',
  ai:      'bg-ai-50 text-ai-700',
  brand:   'bg-brand-50 text-brand-700',
}

/** 狀態標籤：顏色有語意（成功／警告／危險），不同頁面同一種狀態看起來一樣 */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular ${TONES[tone]}`}>
      {children}
    </span>
  )
}
