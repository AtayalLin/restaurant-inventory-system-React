/**
 * MSW 請求處理：在瀏覽器裡模擬 json-server、n8n 與 NVIDIA NIM
 *
 * 前端程式碼完全不用改：hooks 照樣呼叫 /api/products、n8n webhook、/nvidia-api，
 * Service Worker 在請求送出前攔截，交給這裡回應。
 * 行為盡量貼近 json-server v1：POST 自動產生 id、PATCH 合併欄位、找不到回 404。
 */
import { http, HttpResponse, delay } from 'msw'
import { db, persist, isCollection } from './db'
import { answerQuestion, restockSuggestion, productCopy } from './ai'
import type { LowStockPayload } from '../hooks/useRestockSuggestion'

type Row = { id: string } & Record<string, unknown>

/**
 * 模擬網路延遲：列表查詢稍慢，讓載入骨架在 Demo 裡也看得到；
 * 單筆讀寫很快，因為「出餐完成」會依序呼叫十幾次 API（讀配方、樂觀鎖扣庫存、寫異動紀錄），
 * 每次都等 0.3 秒的話整個流程要 5 秒以上。
 */
const listLatency = () => delay(200 + Math.random() * 200)
const latency = () => delay(30)

function newId() {
  return Math.random().toString(36).slice(2, 12)
}

function table(name: string): Row[] | null {
  return isCollection(name) ? (db[name] as unknown as Row[]) : null
}

const notFound = () => HttpResponse.json({ error: 'Not Found' }, { status: 404 })

export const handlers = [
  // ── 系統設定：json-server 的單一物件資源 ─────────────────
  http.get('*/api/settings', async () => {
    await latency()
    return HttpResponse.json(db.settings)
  }),
  http.patch('*/api/settings', async ({ request }) => {
    await latency()
    Object.assign(db.settings, await request.json())
    persist()
    return HttpResponse.json(db.settings)
  }),

  // ── 一般集合 CRUD ───────────────────────────────────────
  http.get('*/api/:collection', async ({ params }) => {
    await listLatency()
    const rows = table(String(params.collection))
    return rows ? HttpResponse.json(rows) : notFound()
  }),
  http.get('*/api/:collection/:id', async ({ params }) => {
    await latency()
    const row = table(String(params.collection))?.find(r => r.id === params.id)
    return row ? HttpResponse.json(row) : notFound()
  }),
  http.post('*/api/:collection', async ({ params, request }) => {
    await latency()
    const rows = table(String(params.collection))
    if (!rows) return notFound()
    const body = (await request.json()) as Record<string, unknown>
    const row = { ...body, id: typeof body.id === 'string' ? body.id : newId() } as Row
    rows.push(row)
    persist()
    return HttpResponse.json(row, { status: 201 })
  }),
  http.patch('*/api/:collection/:id', async ({ params, request }) => {
    await latency()
    const row = table(String(params.collection))?.find(r => r.id === params.id)
    if (!row) return notFound()
    Object.assign(row, await request.json(), { id: row.id })
    persist()
    return HttpResponse.json(row)
  }),
  http.put('*/api/:collection/:id', async ({ params, request }) => {
    await latency()
    const rows = table(String(params.collection))
    const index = rows?.findIndex(r => r.id === params.id) ?? -1
    if (!rows || index < 0) return notFound()
    rows[index] = { ...((await request.json()) as Record<string, unknown>), id: rows[index].id }
    persist()
    return HttpResponse.json(rows[index])
  }),
  http.delete('*/api/:collection/:id', async ({ params }) => {
    await latency()
    const rows = table(String(params.collection))
    const index = rows?.findIndex(r => r.id === params.id) ?? -1
    if (!rows || index < 0) return notFound()
    const [removed] = rows.splice(index, 1)
    persist()
    return HttpResponse.json(removed)
  }),

  // ── n8n Agent B：自然語言查詢助理 ───────────────────────
  http.post('*/webhook/query-assistant', async ({ request }) => {
    await delay(700)
    const { question } = (await request.json()) as { question?: string }
    return HttpResponse.json(answerQuestion(question ?? ''))
  }),

  // ── n8n Agent A：AI 補貨建議 ─────────────────────────────
  http.post('*/webhook/test-lin', async ({ request }) => {
    await delay(900)
    const payload = (await request.json()) as LowStockPayload
    return HttpResponse.json(restockSuggestion(payload))
  }),

  // ── NVIDIA NIM：菜單文案（SSE 串流，逐字吐出）───────────
  http.post('*/nvidia-api/v1/chat/completions', async ({ request }) => {
    const body = (await request.json()) as { messages?: { content?: string }[] }
    const text = productCopy(body.messages?.[0]?.content ?? '')
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // 每次送 2 個字，模擬模型逐字輸出的效果
        for (let i = 0; i < text.length; i += 2) {
          const chunk = { choices: [{ delta: { content: text.slice(i, i + 2) } }] }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          await delay(35)
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } })
  }),
]
