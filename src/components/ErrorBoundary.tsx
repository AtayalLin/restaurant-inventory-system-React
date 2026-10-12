import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 錯誤邊界：子元件在渲染時拋出錯誤，顯示錯誤畫面而不是整頁空白
 *
 * 為什麼一定要用 class component：
 *   React 目前只有 class component 能實作 getDerivedStateFromError / componentDidCatch，
 *   function component 沒有對應的 hook。
 *
 * 注意：錯誤邊界只攔得到「渲染期間」的錯誤；
 *   API 請求失敗、事件處理函式裡的錯誤，仍由 TanStack Query 的 isError 或 try/catch 處理。
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 開發時在主控台留下完整堆疊，方便除錯
    console.error('畫面渲染錯誤：', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div role="alert" className="mx-auto mt-12 max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto text-red-500" size={36} aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">這個頁面發生錯誤</h2>
        <p className="mt-2 text-sm text-gray-600">
          其他頁面仍可正常使用。重新載入後如果還是一樣，請回報下方的錯誤訊息。
        </p>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-50 p-3 text-left text-xs text-gray-700">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E3A8A]"
        >
          重新載入頁面
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
