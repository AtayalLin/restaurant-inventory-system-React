import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/nvidia-api': {
        // NVIDIA NIM API proxy：避免瀏覽器 CORS 問題
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
      },
      '/api': {
        // json-server proxy：前端呼叫 /api/... → 轉發到 http://localhost:3001/...
        // 為什麼需要：瀏覽器直接打 localhost:3001 會有 CORS 問題
        // 例如 fetch('/api/ingredients') → http://localhost:3001/ingredients
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})