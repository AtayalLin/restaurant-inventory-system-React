// 每個測試檔共用的前置作業：啟動 MSW 攔截請求，每個測試前重置模擬資料庫
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
import { resetDb } from '../mocks/db'

export const server = setupServer(...handlers)

// onUnhandledRequest: 'error'：測試打到沒有模擬的網址就直接失敗，避免默默連到真的服務
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// 固定「現在時間」：種子資料與「近 7 天」計算都以今天為基準，不固定的話測試結果會隨日期改變。
// 只模擬 Date，不模擬 setTimeout，MSW 的延遲回應才能正常運作。
const NOW = new Date('2026-10-14T12:00:00+08:00')
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  resetDb(NOW)
})
afterEach(() => { vi.useRealTimers() })
