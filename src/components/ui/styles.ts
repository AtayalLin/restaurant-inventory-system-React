/** 輸入框共用樣式；有錯誤時改成紅框 */
export function inputClass(hasError = false) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3/70
    focus:outline-none focus:ring-4 ${hasError
      ? 'border-rose-400 focus:ring-rose-100'
      : 'border-line focus:border-brand-500 focus:ring-brand-100'}`
}
