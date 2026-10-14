// Playwright 端對端測試設定
// 測試對象是 Demo 版（MSW 模擬後端），不需要 Spring Boot、MySQL，CI 上也能直接跑
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE = `http://localhost:${PORT}/restaurant-inventory-system-React/`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,       // CI 上不允許殘留 test.only
  retries: process.env.CI ? 1 : 0,     // CI 偶發不穩時重試一次
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    trace: 'retain-on-failure',        // 失敗時保留操作紀錄，方便除錯
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 本機已有 Chromium 時可用環境變數指定，免重新下載
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
  // 先建置 Demo 版再啟動預覽伺服器；本機已開著就直接沿用
  webServer: {
    command: `npm run build:demo && npx vite preview --mode demo --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
