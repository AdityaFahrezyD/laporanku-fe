import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { API_BASE_URL } from './src/services/api.js'
export default defineConfig(() => {

  const proxy = { target: API_BASE_URL, changeOrigin: true }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          ...proxy,
          bypass(req) {
            // Only the login page belongs to React; API requests go to Laravel.
            const pathname = req.url.split('?')[0]
            if ((req.method === 'GET' || req.method === 'HEAD') && /^\/api\/login\/?$/.test(pathname)) return '/index.html'
          },
        },
        '/sanctum': proxy,
      },
    },
  }
})
