import { useState, type FormEvent } from 'react'
import { Sparkles, Send, AlertCircle, MessageSquareText } from 'lucide-react'
import { Card, CardHeader, Badge, Button } from '../ui'
import { useQueryAssistant } from '../../hooks/useQueryAssistant'

// 建議問題：對應 n8n 目前支援的意圖，讓第一次使用的人知道可以問什麼
const SUGGESTIONS = ['本週營收多少？', '這個月跟上個月比如何？', '哪個商品賣得最好？']

/** Agent B：自然語言查詢助理 */
export function QueryAssistantCard() {
  const queryAssistant = useQueryAssistant()
  const [question, setQuestion] = useState('')

  const ask = (q: string) => {
    if (!q.trim() || queryAssistant.isPending) return
    setQuestion(q)
    queryAssistant.mutate(q)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<Sparkles size={18} className="text-ai-600" aria-hidden="true" />}
        title="智慧查詢助理"
        description="用一句話問營運數字，數字由系統計算，AI 只負責說明"
        aside={<Badge tone="ai">AI</Badge>}
      />

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="assistant-question" className="sr-only">輸入問題</label>
          <input
            id="assistant-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例如：本週營收多少？"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-3
              focus:border-ai-500 focus:outline-none focus:ring-4 focus:ring-ai-100"
          />
          <Button type="submit" variant="ai" loading={queryAssistant.isPending}
            icon={<Send size={16} aria-hidden="true" />} disabled={!question.trim()}>
            <span className="hidden sm:inline">{queryAssistant.isPending ? '思考中' : '詢問'}</span>
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => ask(s)} disabled={queryAssistant.isPending}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-2 transition-colors
                hover:border-ai-200 hover:bg-ai-50 hover:text-ai-700 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="flex flex-1 flex-col">
          {queryAssistant.isIdle && (
            <div className="mt-1 flex flex-1 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
              <MessageSquareText size={22} className="text-ai-500" aria-hidden="true" />
              <p className="mt-2 text-sm text-ink-2">點選上方的問題，或輸入你想知道的營運數字</p>
              <p className="mt-1 text-xs text-ink-3">回答中的數字都由系統從銷售資料計算</p>
            </div>
          )}
          {queryAssistant.isError && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle size={16} aria-hidden="true" />
              查詢服務暫時無法使用，請確認 n8n 已啟動後再試一次
            </p>
          )}
          {queryAssistant.isSuccess && (
            <div className="rounded-xl border border-ai-100 bg-ai-50/60 p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ai-700">
                <Sparkles size={13} aria-hidden="true" />AI 回答
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{queryAssistant.data.answer}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
