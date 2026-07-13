/**
 * 自然語言查詢助理相關型別定義
 *
 * 設計理念：採用「意圖註冊表」模式（類似 Snowflake Cortex Analyst 的語意層概念）
 * AI 不會自己生成查詢邏輯，而是從這裡定義好的「意圖清單」中選一個，
 * 實際的資料運算交給後端（n8n）寫死的邏輯處理，避免 AI 算錯數字。
 *
 * 之後要新增查詢類型，只要在 QueryIntent 加一個新的字串即可，
 * 不需要改動前端呼叫邏輯。
 */

// 目前支援的查詢意圖清單（第一階段只做前兩個，其餘先保留型別供未來擴充）
export type QueryIntent =
  | 'REVENUE_COMPARISON'   // 本週/本月營收，與上期比較
  | 'TOP_SELLING_PRODUCTS' // 銷售排行榜前 N 名
  // 以下為第二階段規劃，先保留型別定義：
  // | 'PROFIT_MARGIN_RANKING'  // 毛利率排行
  // | 'LOW_STOCK_QUERY'        // 缺貨/即期食材查詢
  // | 'PRODUCT_SALES_TREND'    // 特定商品銷售趨勢

// 使用者送出問題時，前端打給 n8n webhook 的請求格式
export interface QueryRequest {
  question: string; // 使用者輸入的自然語言問題，例如「本週哪個商品最賺錢」
}

// n8n 處理完後回傳給前端的格式
export interface QueryResponse {
  intent: QueryIntent | 'UNKNOWN'; // AI 判斷出的意圖，UNKNOWN 代表無法辨識的問題
  answer: string;                  // AI 用自然語言組織好的回答，直接顯示給使用者
  data?: Record<string, unknown>;  // 附帶的結構化資料（例如排行榜陣列），可選，供未來畫圖表用
}