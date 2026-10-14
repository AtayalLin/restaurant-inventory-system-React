import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** 底部按鈕列（取消／送出） */
  footer?: ReactNode
  /** 送出中時禁止關閉，避免請求進行到一半就把表單關掉 */
  busy?: boolean
  /** 寬版：含多列明細的表單（採購單、銷售訂單）使用 */
  wide?: boolean
}

/** 共用對話框：遮罩點擊、Esc 都可關閉；role="dialog" 讓螢幕閱讀器知道這是對話框 */
export function Modal({ title, onClose, children, footer, busy = false, wide = false }: ModalProps) {
  const titleId = useId() // 給 aria-labelledby 用，對話框名稱 = 標題

  useEffect(() => {
    // Esc 關閉；開啟期間鎖住背景捲動，結束時還原
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, busy])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={() => !busy && onClose()} // 點遮罩關閉
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()} // 點內容不關閉
        className={`flex max-h-[85vh] w-full flex-col ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-[var(--radius-card)] bg-white shadow-2xl`}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 id={titleId} className="text-lg font-semibold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="關閉"
            className="rounded-lg p-1.5 text-ink-3 hover:bg-slate-100 hover:text-ink disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </div>
  )
}
