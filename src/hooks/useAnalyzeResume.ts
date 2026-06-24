import { useState } from 'react'

type JobType = 'frontend' | 'fullstack' | 'backend'

const JOB_LABELS: Record<JobType, string> = {
  frontend: '前端工程師',
  fullstack: '全端工程師',
  backend: '後端工程師',
}

// ===== MOCK 開關 =====
// true = 假資料模式（不消耗 API 額度）
// false = 真實 OpenAI API
const USE_MOCK = false

const MOCK_RESPONSES: Record<JobType, string> = {
  frontend: `💪 優勢亮點

1. 雙框架實戰經驗：同時擁有 Vue 3 與 Angular 19 完整專案經驗，在 junior 候選人中相當罕見。

2. 工程思維完整：懶飽飽專案的 Mock/真實 API 雙模式設計、v0.1–v0.4 的 CHANGELOG 紀錄，顯示你具備超出 junior 水準的架構規劃能力。

3. 作品可驗證性高：所有專案皆部署上線，Vue 電商累積 30 位開發者 clone。

⚠️ 需要加強

1. React 缺口：台灣前端職缺中 React 需求佔約 40–50%，建議盡快補上一個中型 React 專案。

2. Git commit 歷程稀疏：Angular 團隊專案只有 3 個 commits，建議補寫 CHANGELOG.md。

3. JS 底層基礎待驗證：閉包、prototype chain、event loop 是技術面試高頻考點。

🎯 針對前端工程師職位的具體建議

1. 在自傳中主動提及 Angular Signals 的設計動機。
2. 把 Mock/真實 API 切換架構寫成 Medium 技術文章。
3. 優先投遞系統整合商、電商平台、遊戲周邊公司。

📝 履歷改寫建議

原句：「擔任團隊前端負責人，以 Angular 19 完成多角色點餐平台」

建議改為：「主導 Angular 19 + Signals 前端架構設計，實作三角色 RBAC 路由控制與 Mock/真實 API 雙模式，縮短後端串接驗證週期約 40%」`,

  fullstack: `💪 優勢亮點

1. 前後端完整串接經驗：Angular 19 + Spring Boot + MySQL 全端實作。
2. 多角色權限系統：RBAC 三角色路由與權限控制。
3. DevOps 意識：GitHub Actions CI/CD 自動部署。

⚠️ 需要加強

1. 後端深度不足：Spring Boot 部分在履歷中著墨較少。
2. 資料庫設計未提及：schema 設計、索引優化未展示。
3. 測試覆蓋率：Vitest 和 Playwright 未提及實際覆蓋率。

🎯 針對全端工程師職位的具體建議

1. 把 Hibernate enum converter bug 寫成技術亮點。
2. 補充 Swagger/OpenAPI 文件。
3. 加入 Docker 容器化設定。

📝 履歷改寫建議

建議改為：「以 Spring Boot + JPA 設計多角色 RESTful API，實作 JWT 身份驗證與三角色 RBAC」`,

  backend: `💪 優勢亮點

1. Java 全端訓練背景：840 小時課程加上實際專案。
2. 資料庫實戰：MySQL schema 設計與 SQL 腳本撰寫。
3. 問題解決能力：Hibernate enum mapping 的 AttributeConverter 解法。

⚠️ 需要加強

1. 後端技術深度：履歷定位偏向前端，需重新包裝。
2. 測試與品質：JUnit 後端單元測試經驗未提及。
3. 系統設計概念：Cache、非同步處理等未提及。

🎯 針對後端工程師職位的具體建議

1. 重新以後端角度重寫自傳。
2. 把 Hibernate bug 解法寫成獨立技術段落。
3. 補充純後端 side project。

📝 履歷改寫建議

建議改為：「以 Spring Boot + JPA 設計多角色 RESTful API，解決 Hibernate enum mapping 問題，實作強制首次修改密碼安全流程」`,
}

// PDF 轉圖片
const pdfToImages = async (file: File): Promise<string[]> => {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: string[] = []
  const maxPages = Math.min(pdf.numPages, 1)

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
  }

  return images
}

export function useAnalyzeResume() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const analyze = async (
    input: { type: 'text'; content: string } | { type: 'pdf'; file: File },
    jobType: JobType
  ) => {
    setIsLoading(true)
    setResult('')
    setError(null)

    try {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        if (input.type === 'pdf') await pdfToImages(input.file)
        setResult(MOCK_RESPONSES[jobType])
        return
      }

      // ===== 真實 OpenAI API =====
      const apiKey = import.meta.env.VITE_NVIDIA_API_KEY
if (!apiKey) throw new Error('找不到 NVIDIA API Key，請確認 .env 設定')

      // 組合 messages 的 content
      // OpenAI 的格式：messages[].content 可以是字串或陣列（混合文字+圖片）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userContent: any[]

      if (input.type === 'pdf') {
        // PDF 模式：每頁轉圖片，用 image_url 格式傳給 GPT-4o
        const images = await pdfToImages(input.file)

        userContent = [
          // OpenAI 圖片格式：type: 'image_url'，url 用 base64 data URI
          ...images.map((base64) => ({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              // detail: 'high' = 高解析度分析，讀取更多細節
              // 'low' 比較省 token，'high' 讀取更清晰
              detail: 'high',
            },
          })),
          {
            type: 'text',
            text: `以上是求職者的履歷 PDF（共 ${images.length} 頁）。請針對「${JOB_LABELS[jobType]}」職位進行分析。`,
          },
        ]
      } else {
        // 文字模式
        userContent = [{
          type: 'text',
          text: `以下是求職者的履歷內容：\n\n${input.content}\n\n請針對「${JOB_LABELS[jobType]}」職位進行分析。`,
        }]
      }

    const response = await fetch('/nvidia-api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // NVIDIA NIM 用跟 OpenAI 一樣的 Bearer token 格式
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    // meta/llama-3.2-11b-vision-instruct：支援圖片輸入的免費模型
    // 11b = 110 億參數，視覺理解能力足夠讀履歷
    model: 'meta/llama-3.2-11b-vision-instruct',
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
       content: `你是一位資深前端技術面試官，專門協助求職者改善履歷。
履歷內容可能含有部分亂碼（來自 PDF 字體編碼問題），請忽略亂碼字元，根據可讀取的內容進行分析。
請用繁體中文回覆，結構清晰，分以下四個區塊：
1. 💪 優勢亮點（2–3 點）
2. ⚠️ 需要加強（2–3 點）
3. 🎯 針對職位的具體建議（3 點）
4. 📝 履歷改寫建議（1–2 句話範例）
分析要具體，直接引用履歷中的專案名稱、技術棧、數字，不要給通用建議。`,
      },
      {
        role: 'user',
        content: userContent,  // 這裡沿用原本已組好的 userContent
      },
    ],
  }),
})

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message ?? `API 錯誤 ${response.status}`)
      }

      const data = await response.json()
      // OpenAI 回傳結構：choices[0].message.content
      // 跟 Gemini 的 candidates[0].content.parts[0].text 不同
      setResult(data.choices[0].message.content)

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請重試')
    } finally {
      setIsLoading(false)
    }
  }

  return { analyze, isLoading, result, error }
}