import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // loadEnv 第三個參數傳 ''：讀取 .env 內「所有」變數，包含沒有 VITE_ 前綴的。
  // 這些變數只存在於 Node.js（開發伺服器）端，不會被打包進前端 JS。
  const env = loadEnv(mode, process.cwd(), '')
  console.log('[vite] NVIDIA_API_KEY：', env.NVIDIA_API_KEY ? `已載入（${env.NVIDIA_API_KEY.slice(0, 6)}…）` : '未設定')
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/nvidia-api': {
          // NVIDIA NIM API proxy：
          // 1. 避免瀏覽器 CORS 問題
          // 2. 【安全性】在伺服器端加上 API 金鑰，前端程式碼與打包檔都不會出現金鑰
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
          headers: env.NVIDIA_API_KEY
            ? { Authorization: `Bearer ${env.NVIDIA_API_KEY}` }
            : undefined,
        },
        '/api': {
          // json-server proxy：前端呼叫 /api/... → 轉發到 API_PROXY_TARGET（預設 http://localhost:3001）
          // 為什麼需要：瀏覽器直接打 localhost:3001 會有 CORS 問題
          // 未來換成 Spring Boot 時，只要在 .env 改 API_PROXY_TARGET 即可
          target: env.API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
