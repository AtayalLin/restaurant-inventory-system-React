import { FlaskConical, RotateCcw } from 'lucide-react'

/**
 * 線上 Demo 提示列：只在 Demo 模式顯示
 * 告訴訪客資料是模擬的、AI 是範例回應，避免誤以為是正式系統；
 * 也提供「重設資料」，讓亂改過的訪客可以回到初始狀態。
 */
function DemoBanner() {
  async function handleReset() {
    const { resetDemoData } = await import('../../mocks/db')
    resetDemoData()
    window.location.reload()
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 print:hidden gap-y-1 bg-ai-50 px-4 py-2 text-center text-xs text-ai-700">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <FlaskConical size={14} aria-hidden="true" />
        線上 Demo
      </span>
      <span className="text-ink-2 sm:hidden">模擬資料・AI 為範例</span>
      <span className="hidden text-ink-2 sm:inline">資料只存在你的瀏覽器，AI 功能為範例回應；可以放心新增、修改。</span>
      <button
        type="button"
        onClick={handleReset}
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-ai-700 underline-offset-2 hover:bg-ai-100 hover:underline focus-visible:outline-2 focus-visible:outline-ai-600"
      >
        <RotateCcw size={12} aria-hidden="true" />
        重設資料
      </button>
    </div>
  )
}

export default DemoBanner
