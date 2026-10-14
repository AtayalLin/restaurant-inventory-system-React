import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastTone = 'success' | 'error'
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastApi { success: (msg: string) => void; error: (msg: string) => void }

const ToastContext = createContext<ToastApi | null>(null)
const DURATION_MS = 3500 // 顯示 3.5 秒後自動消失

/** 操作結果提示（新增成功、刪除失敗…）；包在 App 最外層，任何元件都能用 useToast() 呼叫 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems(list => list.filter(t => t.id !== id))
  }, [])

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random()
    setItems(list => [...list.slice(-2), { id, tone, message }]) // 最多同時 3 則
    setTimeout(() => dismiss(id), DURATION_MS)
  }, [dismiss])

  // useMemo：api 物件保持同一個參考，使用它的元件不會因此重新渲染
  const api = useMemo<ToastApi>(() => ({
    success: msg => push('success', msg),
    error: msg => push('error', msg),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live：新提示出現時，螢幕閱讀器會自動念出 */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map(t => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg
              ${t.tone === 'success' ? 'border-emerald-200 text-ink' : 'border-rose-200 text-ink'}`}
          >
            {t.tone === 'success'
              ? <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-600" aria-hidden="true" />
              : <AlertCircle size={18} className="mt-px shrink-0 text-rose-600" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="關閉提示" className="text-ink-3 hover:text-ink">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook 與 Provider 放同檔較好維護
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必須在 <ToastProvider> 內使用')
  return ctx
}

/** 把未知錯誤轉成使用者看得懂的訊息 */
// eslint-disable-next-line react-refresh/only-export-components
export function errorMessage(err: unknown, fallback = '操作失敗，請稍後再試') {
  return err instanceof Error && err.message ? err.message : fallback
}
