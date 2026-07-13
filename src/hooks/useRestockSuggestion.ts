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

// 逾時時間集中管理成常數，方便之後統一調整，也讓數字有名字、不是裸的 magic number
const REQUEST_TIMEOUT_MS = 20000 // 20 秒
// 為什麼是 20 秒：實測過 n8n → NVIDIA NIM 這條鏈路正常情況下 1-2 秒內完成，
//   但曾經遇過異常拖到超過 1 分鐘的狀況（見開發紀錄）。
//   20 秒是「給 AI 服務合理的緩衝時間」跟「使用者不會等到懷疑人生」之間的折衷，
//   之後如果實測發現常態耗時變長，這裡是唯一要改的地方。

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
//
// 【本次修正】原本沒有設定逾時機制：如果 n8n 或 NVIDIA API 異常卡住，
//   fetch() 會無限期等待，前端按鈕會永遠停在 loading 狀態、沒有任何錯誤提示，
//   使用者只能乾等或重新整理頁面。改用 AbortController 加上主動逾時判斷。
async function fetchRestockSuggestion(payload: LowStockPayload): Promise<RestockSuggestionResponse> {
  // AbortController：瀏覽器原生 API，用來「主動取消」還在進行中的 fetch 請求
  const controller = new AbortController()

  // setTimeout 在指定時間後呼叫 controller.abort()，會讓下面的 fetch 立刻拋出錯誤
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(N8N_RESTOCK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal, // 把 controller 的訊號綁到這個請求上，abort() 才抓得到它
    })

    if (!res.ok) {
      throw new Error(`AI 補貨建議服務錯誤：${res.status}`)
    }

    return res.json()
  } catch (err) {
    // 判斷這次失敗是不是「逾時被我們自己取消的」，還是其他原因（例如網路斷線、n8n 沒開）
    // 這樣使用者看到的錯誤訊息才會對應到實際情況，而不是統一顯示一句籠統的錯誤
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI 補貨建議逾時，請確認 n8n 服務是否正常運作後再試一次')
    }
    throw err // 其他類型的錯誤（例如 res.ok 檢查拋出的錯誤）原樣往外丟，交給 useMutation 的 onError/isError 處理
  } finally {
    // 不論成功、失敗、或逾時，都要清掉這個計時器，
    // 避免請求已經正常結束了，計時器卻還留著、之後莫名其妙觸發 abort()
    clearTimeout(timeoutId)
  }
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