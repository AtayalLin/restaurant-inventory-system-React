// useAI.ts：NVIDIA NIM AI 功能的核心 hook
// 關聯：src/pages/products/ProductFormModal.tsx（商品文案生成按鈕）

// ── NVIDIA NIM API 設定 ───────────────────────────────────
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY as string
// import.meta.env：Vite 的環境變數存取方式
// VITE_ 前綴：只有 VITE_ 開頭的變數才會暴露給前端
// 關聯：.env 檔案的 VITE_NVIDIA_API_KEY

// const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct'
// // 為什麼選這個模型：
// //   llama-3.3-70b 是 NVIDIA NIM 上中文能力強、速度快的模型
// //   適合短文案生成，比 nemotron-ultra 更省 token、回應更快

const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct'
// 為什麼選這個模型（而非一開始曾用過的 llama-3.3-70b-instruct）：
//   實測發現 70b 模型在 NVIDIA NIM 免費層級經常出現 504 逾時，
//   8b 模型除了明顯更快更穩定之外，短文案生成這種任務對模型規模需求不高，
//   8b 完全夠用。這個決策也讓專案內兩個 AI 功能（商品文案生成、AI 補貨建議）
//   統一使用同一個模型，架構更一致、更好維護。

// 【本次新增】逾時時間，集中管理成常數方便之後調整
const REQUEST_TIMEOUT_MS = 20000 // 20 秒
// 為什麼是 20 秒：實測過 NVIDIA NIM 免費層級偶爾會出現 504 逾時，
//   有時候幾秒內就成功，有時候會卡超過 1-2 分鐘沒有回應。
//   20 秒是「給服務合理的等待時間」和「使用者不會被無限期卡住」之間的折衷，
//   之後如果實測發現常態耗時不同，這裡是唯一要改的地方。

// ── 商品文案生成（Streaming 版）────────────────────────────
// 為什麼用 generator function（async function*）：
//   Streaming API 是逐塊回傳，generator 可以用 yield 逐字吐出
//   呼叫端用 for await...of 接收，寫法直覺且不需要 callback
export async function* generateProductDescription(
  productName: string,
  category: string,
  price: number
): AsyncGenerator<string> {
  // AsyncGenerator<string>：每次 yield 一段文字字串

  if (!NVIDIA_API_KEY) {
    throw new Error('找不到 NVIDIA API Key，請確認 .env 是否有設定 VITE_NVIDIA_API_KEY，並重新啟動 npm run dev')
  }

  // ── Prompt 設計 ──────────────────────────────────────────
  const prompt = `你是一位專業的台灣餐廳菜單文案撰寫師。
請為以下商品寫一段吸引人的菜單描述：

商品名稱：${productName}
分類：${category}
售價：NT$ ${price}

要求：
- 繁體中文
- 50～80 字
- 語氣親切、食欲感強
- 突出食材特色或烹調方式
- 不要重複商品名稱開頭
- 只輸出描述文字，不要加標題或引號`

  // 【本次新增】AbortController：用來主動中斷卡太久的請求
  // 為什麼需要：NVIDIA NIM 免費層級偶爾會逾時卡住不回應（實測過 504 Gateway Timeout），
  //   原本沒有逾時機制時，使用者點擊按鈕後，如果服務異常，畫面會永遠停在「生成中」，
  //   沒有任何提示，只能手動重新整理頁面。
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // ── 發送 Streaming 請求 ───────────────────────────────────
  let response: Response
  try {
    response = await fetch('/nvidia-api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        // Bearer token：NVIDIA NIM 用跟 OpenAI 一樣的認證格式
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        // max_tokens：限制回應長度，文案 80 字約需 150–200 tokens
        stream: true,
        // stream: true：啟用 SSE 串流，回應分塊傳回而不是等全部完成
        temperature: 0.8,
        // temperature 0.8：稍高的創意度，讓每次生成的文案有些變化
        // 0.0 = 完全固定、1.0 = 非常隨機，0.8 對文案生成是好的平衡
      }),
      signal: controller.signal, // 把逾時訊號綁到這個請求上，abort() 才抓得到它
    })
  } catch (err) {
    // 【本次新增】判斷這次失敗是不是「我們自己因為逾時而取消的」，
    //   跟其他原因（網路斷線、DNS 錯誤等）分開處理，讓使用者看到的訊息更貼近實際狀況
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`AI 生成逾時（超過 ${REQUEST_TIMEOUT_MS / 1000} 秒未回應），NVIDIA 服務可能較忙碌，請稍後再試`)
    }
    throw err
  } finally {
    // 請求已經送出並收到回應（或已知失敗），不再需要這個計時器
    // 這裡先清一次，避免「連線建立」跟「讀取串流」中間這段時間逾時計時器誤觸發
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    let detail = ''
    try {
      detail = await response.text()
    } catch {
      // 讀取失敗就算了，不影響主要錯誤訊息
    }
    throw new Error(
      `NVIDIA API 錯誤：${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ''}`
      // slice(0, 200)：避免錯誤內容過長塞爆畫面，200 字足夠看出問題方向
    )
  }

  if (!response.body) {
    throw new Error('回應沒有 body，可能是 /nvidia-api proxy 設定有誤，請確認 vite.config.ts')
  }

  // ── 讀取 SSE 串流 ─────────────────────────────────────────
  const reader  = response.body.getReader()
  // getReader()：取得 ReadableStream 的讀取器，逐塊讀取
  const decoder = new TextDecoder('utf-8')
  // TextDecoder：把 Uint8Array（二進位）轉成字串

  let buffer = ''
  // buffer：暫存不完整的 SSE 行（網路分塊不一定對齊換行）

  // 【本次新增】讀取串流期間也要套用逾時保護：
  //   前面的 fetch 只保護「連線建立」這一步，但如果連線建立成功、
  //   卻在讀取串流資料的過程中卡住不動（NVIDIA 那端開始回應但突然停住），
  //   前面的 timeoutId 已經被 clearTimeout 清掉，不會再保護這個階段。
  //   這裡重新建立一個獨立的逾時計時器，專門保護「讀取串流」這個迴圈。
  const streamTimeoutId = setTimeout(() => {
    reader.cancel('讀取串流逾時') // 主動關閉讀取器，讓下面的 reader.read() 拋出錯誤或結束迴圈
  }, REQUEST_TIMEOUT_MS)

  try {
    while (true) {
      const { done, value } = await reader.read()
      // done：串流結束
      // value：這次讀到的 Uint8Array 資料塊

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      // { stream: true }：告訴 decoder 後面還有資料，不要強制結束解碼

      const lines = buffer.split('\n')
      // SSE 格式：每個事件以換行分隔
      // 例如：'data: {"choices":[{"delta":{"content":"精"}}]}\n\n'

      buffer = lines.pop() ?? ''
      // pop()：把最後一個不完整的行存回 buffer，等下次讀取補完

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed || trimmed === 'data: [DONE]') continue
        // 空行：SSE 的事件分隔符，跳過
        // 'data: [DONE]'：串流結束信號，跳過

        if (!trimmed.startsWith('data: ')) continue
        // SSE 格式：每行以 'data: ' 開頭

        try {
          const json = JSON.parse(trimmed.slice(6))
          // slice(6)：去掉 'data: ' 前綴，取得 JSON 字串
          const content = json.choices?.[0]?.delta?.content
          // delta.content：這個 chunk 新增的文字內容
          // 例如：'精'、'燉'、'8'、'小'、'時' 逐字吐出

          if (content) {
            yield content
            // yield：把這段文字吐給呼叫端，呼叫端用 for await...of 接收
          }
        } catch {
          // JSON.parse 失敗：忽略格式錯誤的行
        }
      }
    }
  } catch (err) {
    // 【本次新增】reader.cancel() 觸發後，reader.read() 通常會拋出錯誤，
    //   在這裡統一轉換成使用者看得懂的逾時訊息
    throw new Error(`AI 生成逾時（超過 ${REQUEST_TIMEOUT_MS / 1000} 秒未完成），NVIDIA 服務可能較忙碌，請稍後再試`)
  } finally {
    clearTimeout(streamTimeoutId)
    // 不論正常結束、逾時、或其他錯誤，都要清掉這個計時器，
    // 避免串流已經正常結束了，計時器卻還留著、之後莫名其妙觸發 cancel()
  }
}