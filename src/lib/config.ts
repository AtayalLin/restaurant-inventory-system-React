/**
 * 前端統一設定：所有 API 與 n8n 端點都從這裡取得
 *
 * 【為什麼集中在這裡】
 * 原本 BASE = '/api' 與 n8n 網址分散寫死在各個 hook，
 * 未來把 json-server 換成 Spring Boot，或 n8n 改部署位置時，要改很多檔案。
 * 集中後只要改 .env 的值，程式碼完全不用動。
 *
 * 【注意】VITE_ 開頭的變數會被打包進前端 JS，任何人都看得到，
 * 所以這裡只能放「網址」這類公開資訊，絕對不能放 API 金鑰。
 * NVIDIA 金鑰改由 vite.config.ts 的 proxy 在伺服器端加上（見該檔說明）。
 */

/**
 * 是否為線上 Demo（vite --mode demo）
 * Demo 版沒有後端與金鑰，所有 API 與 AI 請求都由 src/mocks 在瀏覽器裡模擬。
 */
export const IS_DEMO: boolean = import.meta.env.MODE === 'demo'

/** json-server（或未來的後端）API 路徑前綴，開發時經由 Vite proxy 轉發 */
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** n8n Agent A：AI 補貨建議 webhook */
export const N8N_RESTOCK_URL: string =
  import.meta.env.VITE_N8N_RESTOCK_URL ?? 'http://localhost:5678/webhook/test-lin'

/** n8n Agent B：智慧查詢助理 webhook */
export const N8N_QUERY_ASSISTANT_URL: string =
  import.meta.env.VITE_N8N_QUERY_URL ?? 'http://localhost:5678/webhook/query-assistant'

/**
 * AI 模型名稱（NVIDIA NIM）
 * 模型會被供應商下架（例如 meta/llama-3.1-8b-instruct 已於 2026-08 停止服務），
 * 所以集中在這裡、可用 .env 覆寫，換模型時不需要修改程式碼。
 * 注意：n8n workflow 內的三個 HTTP Request 節點也要使用同一個模型名稱。
 */
export const AI_MODEL: string =
  import.meta.env.VITE_AI_MODEL ?? 'nvidia/nemotron-3.5-lightning-30b-a3b'
