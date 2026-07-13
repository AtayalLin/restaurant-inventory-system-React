/**
 * 共用的 fetch 輔助函式，處理 json-server 特有的兩個問題：
 *
 * 1. 304 Not Modified + 空 body 問題：
 *    瀏覽器會自動帶 If-None-Match 快取標頭，json-server 收到後回傳 304 + 空 body，
 *    res.json() 解析空 body 會拋出 SyntaxError，若沒處理會導致呼叫方誤判、無限重試。
 *    用 Cache-Control: no-cache 強制每次都拿到最新資料，繞過這個問題。
 *
 * 2. json-server 短暫斷線／併發寫入時偶爾失敗：
 *    加上重試機制（預設 2 次 + 指數退避），讓前端能自動從暫時性錯誤中恢復。
 *
 * 【為什麼抽成共用檔案】
 * 原本 useProducts.ts / useIngredients.ts / useSalesOrders.ts
 * 各自複製貼上了一份幾乎一樣的 fetchJSON，容易在多次修改後彼此不同步
 * （例如 useSalesOrders.ts 的版本多了 options 參數，但另外兩個沒有）。
 * 統一成一份之後，之後要調整重試次數、退避時間等邏輯，只需要改這一個檔案。
 *
 * 【呼叫端的搭配注意事項】
 * 這個函式內部已經處理重試，所以呼叫端如果是透過 TanStack Query 的 useQuery 使用，
 * 記得在 useQuery 設定裡加上 retry: false，避免 TanStack Query 外層又重試一次，
 * 兩層重試疊加會讓失敗判定（isError）延遲超過 10 秒才觸發。
 * （這個教訓來自本專案 Dashboard 頁面實測：json-server 關閉時，
 * 疊加重試曾經讓錯誤畫面卡住超過 10 秒才顯示，詳見開發紀錄。）
 */

export async function fetchJSON<T>(
  url: string,
  options?: RequestInit,
  retries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(options?.headers ?? {}),
        },
      })
      if (!res.ok) throw new Error(`API 錯誤：${res.status}`)
      return res.json()
    } catch (err) {
      if (attempt === retries) throw err
      // 指數退避：第一次重試等 300ms，第二次等 600ms
      // 為什麼要等待：給 json-server 一點喘息時間恢復，立即重試很可能再次失敗
      await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)))
    }
  }
  throw new Error('無法連線到伺服器')
}

/**
 * 序列寫入 helper：依序執行多筆 PATCH 請求，取代 Promise.all 併發寫入。
 *
 * 為什麼需要：json-server 用單一 db.json 檔案做持久化，
 * 多筆寫入同時併發容易造成寫入衝突或讓伺服器瞬間過載當機。
 * 用 for...of 依序執行，犧牲一點速度，換取穩定性。
 *
 * 目前只有 useSalesOrders.ts 的 useCompleteSalesOrder 會用到，
 * 但抽到這裡是因為未來如果 usePurchaseOrders.ts 也有類似「一次更新多筆食材庫存」
 * 的情境（例如確認採購單收貨時），可以直接複用，不用再寫一次。
 */
export async function patchSequentially(
  updates: { url: string; body: Record<string, unknown> }[]
): Promise<void> {
  for (const { url, body } of updates) {
    await fetchJSON(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
}