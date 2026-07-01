import { useMutation } from '@tanstack/react-query'
// useMutation：補貨建議是「使用者主動觸發一次性動作」（呼叫 n8n → AI），
//   不是被動的資料讀取，語意上更接近 mutation 而非 query
// 關聯：src/pages/Dashboard.tsx 的「AI 補貨建議」按鈕會用到這個 hook

// ==========================================
// n8n Webhook 端點
// 為什麼不用 /api 前綴：n8n 是獨立服務（port 5678），不經過 json-server 的 Vite proxy
//   直接打 n8n 的 Production URL
// ==========================================
const N8N_RESTOCK_URL = 'http://localhost:5678/webhook/test-lin'
// TODO: 之後正式化時，這個 path 建議改名為更語意化的 'restock-suggestion'
//   並考慮搬進 .env（例如 VITE_N8N_RESTOCK_URL），避免寫死在程式碼裡

export interface LowStockPayload {
  ingredients: {
    name: string
    currentStock: number
    safetyStock: number
    unit: string
    shortage: number
  }[]
}

export interface RestockSuggestionResponse {
  suggestion: string
  tokensUsed: number
}

// ── fetch helper：n8n 呼叫失敗時的處理 ──────────────────────
// 為什麼不套用 useProducts.ts 那套 retry 機制：
//   n8n → NVIDIA NIM 這條鏈路本身就涉及 AI 推論，單次請求可能要好幾秒
//   重試 AI 呼叫的代價（時間、token 用量）比一般 CRUD API 高很多
//   這裡選擇「失敗就直接告知使用者」，讓使用者自行決定要不要重新點擊
async function fetchRestockSuggestion(payload: LowStockPayload): Promise<RestockSuggestionResponse> {
  const res = await fetch(N8N_RESTOCK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`AI 補貨建議服務錯誤：${res.status}`)
  }
  return res.json()
}

// 取得 AI 補貨建議
export function useRestockSuggestion() {
  return useMutation({
    mutationFn: fetchRestockSuggestion,
    // 不需要 onSuccess 做 invalidateQueries：
    //   這個 mutation 不改變任何本地資料庫狀態（products/ingredients/salesOrders）
    //   純粹是「呼叫外部服務取得文字建議」，結果直接存在元件的 mutation.data 裡顯示即可
  })
}