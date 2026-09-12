import { test, expect } from '@playwright/test'
import * as mock from '../../src/data/dashboardMock.js'

for (const role of ['guest', 'admin']) {
  for (const width of [320, 360, 380, 390, 430, 1280]) {
    test(`${role} at ${width}px keeps horizontal scrolling inside tables`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      const data = structuredClone({ wallets: mock.wallets, incomes: mock.incomes.slice(0, 1), expenses: mock.expenses.slice(0, 1), transfers: mock.transfers.slice(0, 1), categories: mock.categories })
      data.wallets[0].name = 'NamaDompetTanpaSpasi'.repeat(2)
      data.wallets[0].balance = '9999999999999.99'
      data.incomes[0].description = 'DeskripsiTanpaSpasi'.repeat(12)
      data.incomes[0].amount = '9999999999999.99'
      await page.route('**/api/**', (route) => {
        const key = new URL(route.request().url()).pathname.split('/').pop()
        return route.fulfill({ status: key === 'user' && role === 'guest' ? 401 : 200, contentType: 'application/json',
          body: JSON.stringify(key === 'user' ? { id: 'admin', role, name: 'Administrator' } : { data: data[key] || [] }) })
      })
      await page.goto('/')
      const table = page.getByRole('table').first()
      await expect(table).toBeVisible()
      const header = page.locator('header').first()
      for (const button of await header.getByRole('button').all()) {
        const box = await button.boundingBox()
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      // Ensure clipping is only a guard: layout itself must fit without it too.
      const naturalWidth = await page.evaluate(() => {
        const elements = [document.documentElement, document.body]
        const old = elements.map((el) => el.style.overflowX)
        elements.forEach((el) => { el.style.overflowX = 'visible' })
        const result = document.documentElement.scrollWidth
        elements.forEach((el, i) => { el.style.overflowX = old[i] })
        return result
      })
      expect(naturalWidth).toBe(width)
      const overflowingText = await page.locator('main').evaluate((main) => [...main.querySelectorAll('p,h1,h2,h3')]
        .filter((el) => !el.closest('table') && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent))
      expect(overflowingText).toEqual([])
      await page.evaluate(() => window.scrollTo({ left: 500, top: 0, behavior: 'instant' }))
      expect(await page.evaluate(() => window.scrollX)).toBe(0)
      if (role === 'admin') {
        const tabs = page.getByRole('tablist')
        expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
        for (const tab of await tabs.getByRole('tab').all()) {
          const box = await tab.boundingBox()
          expect(box.x + box.width).toBeLessThanOrEqual(width)
        }
        if (width < 640) {
          const first = await tabs.getByRole('tab').first().boundingBox()
          const last = await tabs.getByRole('tab').last().boundingBox()
          expect(last.y).toBeGreaterThan(first.y)
        }
        await tabs.getByRole('tab', { name: 'Income', exact: true }).focus()
        await page.keyboard.press('End')
        await expect(tabs.getByRole('tab', { name: 'Kategori', exact: true })).toBeFocused()
        await page.keyboard.press('Home')
        await expect(tabs.getByRole('tab', { name: 'Income', exact: true })).toBeFocused()
      }
      const scroller = table.locator('..')
      await scroller.scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
      if (width < 640) {
        await scroller.hover()
        await page.mouse.wheel(10000, 0)
        await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
        const lastColumn = await table.locator('thead th').last().boundingBox()
        const area = await scroller.boundingBox()
        expect(lastColumn.x).toBeGreaterThanOrEqual(area.x - 1)
        expect(lastColumn.x + lastColumn.width).toBeLessThanOrEqual(area.x + area.width + 1)
        await page.mouse.wheel(10000, 0)
        expect(await page.evaluate(() => window.scrollX)).toBe(0)
        await page.mouse.wheel(-10000, 0)
        await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBe(0)
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await header.hover()
      await page.mouse.wheel(1000, 0)
      expect(await page.evaluate(() => window.scrollX)).toBe(0)
      if (width === 380) await page.screenshot({ path: `test-results/horizontal-${role}.png` })
    })
  }
}
