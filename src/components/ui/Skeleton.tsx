/** 骨架畫面：載入時先顯示版面輪廓，比「載入中…」文字更不會讓畫面跳動 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" />
}
