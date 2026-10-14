// Vitest 測試設定
// 測試在 Node.js 執行，API 請求由 MSW（src/test/server.ts）攔截，
// 直接沿用線上 Demo 的模擬後端，不需要啟動 json-server。
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Node 的 fetch 不接受相對路徑，測試時把 API 前綴換成完整網址
    env: { VITE_API_BASE_URL: 'http://localhost/api' },
  },
})
