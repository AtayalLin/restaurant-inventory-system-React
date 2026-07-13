import { useMutation } from '@tanstack/react-query';
import type { QueryRequest, QueryResponse } from '../types/query';

/**
 * useQueryAssistant
 *
 * 用途：呼叫 n8n 的自然語言查詢 webhook，讓使用者用口語問題查詢營運資料
 * （例如「本週營收多少」），取得 AI 組織好的自然語言回答。
 *
 * 架構說明：
 * 前端只負責「送出問題、顯示回答」，不做任何資料運算。
 * 實際流程：n8n Webhook 接收問題 → AI 判斷屬於哪種查詢意圖（QueryIntent）
 *   → 用寫死的邏輯去 json-server 撈資料並計算 → AI 把結果組成自然語言回答
 *   → 回傳給這個 hook。
 *
 * 為什麼不直接在前端呼叫 NVIDIA API？
 * 1. API 金鑰不會暴露在前端程式碼裡
 * 2. 意圖判斷邏輯、資料運算邏輯集中在 n8n，之後要擴充新的查詢類型時
 *    不需要改動前端程式碼，只要在 n8n workflow 裡加邏輯即可
 *
 * 沿用 useRestockSuggestion.ts 已經驗證穩定的 fetch + retry 架構。
 */

const N8N_QUERY_ASSISTANT_URL = 'http://localhost:5678/webhook/query-assistant';
// TODO: 之後正式部署時，改用環境變數 import.meta.env.VITE_N8N_QUERY_URL

async function fetchQueryAnswer(question: string): Promise<QueryResponse> {
  const response = await fetch(N8N_QUERY_ASSISTANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question } satisfies QueryRequest),
  });

  if (!response.ok) {
    throw new Error(`查詢助理服務錯誤（狀態碼 ${response.status}）`);
  }

  const data = await response.json();
  return data as QueryResponse;
}

export function useQueryAssistant() {
  return useMutation({
    mutationFn: fetchQueryAnswer,
    // 沿用 restock suggestion 的重試策略：網路不穩時自動重試，
    // 但避免無限重試造成使用者等太久
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}