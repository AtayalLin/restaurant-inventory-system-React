import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/ui'
import { SessionProvider } from './session/SessionProvider'

const queryClient = new QueryClient()

async function bootstrap() {
  // Demo 模式（npm run build:demo，部署到 GitHub Pages 的版本）：
  // 先啟動 MSW，在瀏覽器裡模擬後端與 AI，再渲染畫面，避免第一批請求沒被攔截。
  // 用動態 import 並直接比對 import.meta.env.MODE（而非 config 的 IS_DEMO），
  // 打包工具才能在一般版本整段移除，一般版本不會包含任何模擬程式碼。
  if (import.meta.env.MODE === 'demo') {
    const { startDemoWorker } = await import('./mocks/browser')
    await startDemoWorker()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {/* ToastProvider：讓所有頁面都能顯示操作結果提示 */}
        <ToastProvider>
          {/* SessionProvider：目前登入身分與門市，決定各頁面可用的功能 */}
          <SessionProvider>
            <App />
          </SessionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
