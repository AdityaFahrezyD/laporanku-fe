import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pwa',
  outputDir: './test-results/pwa',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5180', channel: 'chrome', headless: true },
  webServer: { command: 'node scripts/serve-pwa-test.mjs', url: 'http://127.0.0.1:5180', reuseExistingServer: false },
})
