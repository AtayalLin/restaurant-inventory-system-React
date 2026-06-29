// useAI.ts：NVIDIA NIM AI 功能的核心 hook
// 關聯：src/pages/products/ProductFormModal.tsx（商品文案生成按鈕）

// ── NVIDIA NIM API 設定 ───────────────────────────────────
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY as string
// import.meta.env：Vite 的環境變數存取方式
// VITE_ 前綴：只有 VITE_ 開頭的變數才會暴露給前端
// 關聯：.env 檔案的 VITE_NVIDIA_API_KEY

const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct'
// 為什麼選這個模型：
//   llama-3.3-70b 是 NVIDIA NIM 上中文能力強、速度快的模型
//   適合短文案生成，比 nemotron-ultra 更省 token、回應更快

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
    throw new Error('找不到 NVIDIA API Key，請確認 .env 設定')
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

  // ── 發送 Streaming 請求 ───────────────────────────────────
  const response = await fetch('/nvidia-api/v1/chat/completions', {
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
  })

  if (!response.ok) {
    throw new Error(`NVIDIA API 錯誤：${response.status}`)
  }

  if (!response.body) {
    throw new Error('回應沒有 body')
  }

  // ── 讀取 SSE 串流 ─────────────────────────────────────────
  const reader  = response.body.getReader()
  // getReader()：取得 ReadableStream 的讀取器，逐塊讀取
  const decoder = new TextDecoder('utf-8')
  // TextDecoder：把 Uint8Array（二進位）轉成字串

  let buffer = ''
  // buffer：暫存不完整的 SSE 行（網路分塊不一定對齊換行）

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
}