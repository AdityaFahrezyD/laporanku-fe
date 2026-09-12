import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { API_BASE_URL } from './src/services/api.js'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig(() => {

  const proxy = { target: API_BASE_URL, changeOrigin: true }
  return {
    plugins: [react(), tailwindcss(), VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png', 'apple-touch-icon.png', 'offline.html'],
      injectManifest: { globPatterns: ['assets/**/*.{js,css,png,svg,woff2}'], globIgnores: ['**/index.html'] },
      manifest: {
        id: '/', name: 'LaporanKu', short_name: 'LaporanKu', lang: 'id',
        description: 'Ringkasan keuangan dan pembukuan bersama.',
        start_url: '/', scope: '/', display: 'standalone',
        theme_color: '#1F444C', background_color: '#F1ECE9',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    })],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          ...proxy,
          bypass(req) {
            // Keep old browser bookmarks working without intercepting JSON API requests.
            const pathname = req.url.split('?')[0]
            if ((req.method === 'GET' || req.method === 'HEAD') && req.headers.accept?.includes('text/html') && /^\/api\/login\/?$/.test(pathname)) return '/index.html'
          },
        },
        '/sanctum': proxy,
      },
    },
  }
})
