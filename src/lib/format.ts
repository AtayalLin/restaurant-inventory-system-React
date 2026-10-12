/** 金額格式：NT$ 1,234 */
export function formatCurrency(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString('zh-TW')}`
}

/**
 * 計算「本期比上期」的變化百分比
 * 上期為 0 時回傳 null：無法計算百分比（除以零），畫面改顯示「無比較資料」，
 * 避免出現 Infinity% 或誤導的 +100%。
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** 時間格式：下午 08:15 */
export function formatTime(timestamp: number): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}
