// useExtractResume.ts
// 職責：把 PDF 每頁轉成圖片，逐頁用 AI OCR 辨識，回傳乾淨的繁體中文文字
// 解決 104 PDF 特殊字體造成的亂碼問題

export async function extractResumeText(
  file: File,
  apiKey: string
): Promise<string> {
  // 動態載入 pdfjs，只在需要時才載入
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages

  let fullText = ''

  // llama-3.2-11b-vision 每次只接受 1 張圖片
  // 所以逐頁處理：每頁轉圖片 → 呼叫 API → 收集文字
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)

    // scale 2.5 = 放大 2.5 倍，讓小字更清晰好辨識
    const viewport = page.getViewport({ scale: 2.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    // quality 0.95 = 高品質 JPEG，保留更多文字細節
    const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]

    const response = await fetch('/nvidia-api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `你是專業的 OCR 文字辨識助手，專門處理繁體中文履歷。
請將圖片中所有文字完整準確地辨識出來。

輸出規則：
- 保持原始段落與區塊結構
- 標題單獨一行，後接空行
- 列表項目用「• 」開頭
- 日期、數字、英文技術名詞保持原樣（如 Vue 3、Angular 19、Spring Boot）
- 個人資訊（姓名、電話、email、地址）完整保留
- 只輸出辨識到的文字，不加任何評論或前言`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: `這是履歷第 ${i} 頁（共 ${totalPages} 頁），請辨識所有文字。`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message ?? `第 ${i} 頁 OCR 失敗`)
    }

    const data = await response.json()
    fullText += data.choices[0].message.content

    // 頁面之間加分隔
    if (i < totalPages) fullText += '\n\n---\n\n'
  }

  return fullText
}