import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** 標籤右側的附加元素，例如「AI 生成描述」按鈕 */
  aside?: ReactNode
  /** 單一輸入元件（input／select／textarea），Field 會自動補上 id 與 aria 屬性 */
  children: ReactElement<Record<string, unknown>>
}

/**
 * 表單欄位：label 透過 htmlFor 綁定輸入框（點標籤可聚焦、螢幕閱讀器讀得到欄位名稱），
 * 錯誤訊息用 aria-describedby 連到輸入框，並以 aria-invalid 標示驗證失敗。
 */
export function Field({ label, required, error, hint, aside, children }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? msgId : undefined,
      })
    : children

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
        </label>
        {aside}
      </div>
      {control}
      {(error || hint) && (
        <p id={msgId} className={`mt-1 text-xs ${error ? 'text-rose-600' : 'text-ink-3'}`}>{error ?? hint}</p>
      )}
    </div>
  )
}
