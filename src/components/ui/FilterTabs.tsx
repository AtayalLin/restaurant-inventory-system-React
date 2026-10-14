interface FilterTabsProps<T extends string> {
  options: { value: T; label: string; count: number }[]
  value: T
  onChange: (value: T) => void
  /** 給螢幕閱讀器的群組名稱，例如「依狀態篩選」 */
  label: string
}

/** 狀態篩選膠囊按鈕（含數量）；aria-pressed 標示目前選中的項目 */
export function FilterTabs<T extends string>({ options, value, onChange, label }: FilterTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13px] transition-colors
              focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100
              ${active ? 'border-brand-700 bg-brand-50 font-semibold text-brand-700' : 'border-line bg-white text-ink-3 hover:text-ink'}`}
          >
            {o.label}
            <span className="tabular text-xs">{o.count}</span>
          </button>
        )
      })}
    </div>
  )
}
