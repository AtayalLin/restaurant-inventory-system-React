import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/** 啟動 Demo 模式的 Service Worker；部署在子路徑時要指定 worker 檔案的完整路徑 */
export function startDemoWorker() {
  return worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // 字型、圖片等其他請求直接放行，也不要在主控台印警告
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}
