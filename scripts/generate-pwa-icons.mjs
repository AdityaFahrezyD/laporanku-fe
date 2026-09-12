import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Rasterize the existing vector leaf; no external image service is involved.
const source = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  for (const [name, size, maskable] of [
    ['pwa-192.png', 192, false], ['pwa-512.png', 512, false],
    ['pwa-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false],
  ]) {
    const svg = maskable ? source.replace('rx="20"', 'rx="0"') : source
    const bytes = await page.evaluate(async ({ svg, size }) => {
      const image = new Image()
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      canvas.getContext('2d').drawImage(image, 0, 0, size, size)
      return Array.from(new Uint8Array(await (await new Promise((resolve) => canvas.toBlob(resolve))).arrayBuffer()))
    }, { svg, size })
    await writeFile(new URL('../public/' + name, import.meta.url), new Uint8Array(bytes))
  }
} finally { await browser.close() }
