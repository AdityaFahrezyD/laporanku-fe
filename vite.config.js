import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxy = { target: env.BACKEND_URL || 'http://laporanku.test', changeOrigin: true }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': proxy,
        '/sanctum': proxy,
        '/logout': proxy,
        '^/login(?:\\?.*)?$': {
          ...proxy,
          bypass(req) {
            // GET /login renders the SPA; only the form POST goes to Laravel.
            if (req.method === 'GET' || req.method === 'HEAD') return '/index.html'
          },
        },
      },
    },
  }
})
