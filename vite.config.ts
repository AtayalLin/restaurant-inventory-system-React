import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // server.proxy：Vite 開發伺服器的反向代理設定
  // 瀏覽器請求 /nvidia-api/... → Vite 幫你轉發到 NVIDIA 伺服器
  // 這樣瀏覽器看到的是同源請求，不會觸發 CORS
  server: {
    proxy: {
    '/nvidia-api': {
      target: 'https://integrate.api.nvidia.com',
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
    },
    },
  },
})