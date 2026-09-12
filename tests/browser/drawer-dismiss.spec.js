import { test, expect } from '@playwright/test'
import * as mock from '../../src/data/dashboardMock.js'

test.use({ viewport: { width: 390, height: 480 }, hasTouch: true })

for (const role of ['guest', 'admin']) {
  test(`${role} drawer dismisses only an outside tap and restores scroll and focus`, async ({ page }) => {
    await page.route('**/api/**', (route) => {
      const [, key, id] = new URL(route.request().url()).pathname.split('/').filter(Boolean)
      const records = mock[key] || []
      const data = id ? records.find((record) => Object.entries(record).some(([field, value]) => field.endsWith('_id') && value === id)) : records
      return route.fulfill({ status: key === 'user' && role === 'guest' ? 401 : 200, contentType: 'application/json',
        body: JSON.stringify(key === 'user' ? { id: 'admin', role, name: 'Administrator' } : { data }) })
    })
    await page.goto('/')
    await expect(page.getByRole('table')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 240))
    const previousScroll = await page.evaluate(() => window.scrollY)
    const trigger = page.getByRole('button', { name: 'Buka menu navigasi' })
    const open = () => trigger.evaluate((el) => { el.focus({ preventScroll: true }); el.click() })
    const drawer = page.getByRole('dialog', { name: 'Menu navigasi' })
    await open()
    await drawer.getByRole('heading', { name: 'Menu navigasi' }).tap()
    await expect(drawer).toBeVisible()
    // Neither dragging out of the panel nor dragging on the backdrop is a tap.
    for (const startX of [200, 380]) {
      await page.mouse.move(startX, 160)
      await page.mouse.down()
      await page.mouse.move(380, 240, { steps: 5 })
      await page.mouse.move(380, 160, { steps: 5 })
      await page.mouse.up()
      await expect(drawer).toBeVisible()
    }
    const menu = drawer.getByRole('navigation', { name: 'Navigasi utama' })
    await menu.hover()
    await page.mouse.wheel(0, 900)
    await expect.poll(() => menu.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    await expect(drawer).toBeVisible()
    await page.touchscreen.tap(380, 200)
    await expect(drawer).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(previousScroll)
    expect(await page.evaluate(() => document.body.style.position)).toBe('')
    expect(await page.evaluate(() => window.scrollX)).toBe(0)
    for (const close of ['button', 'escape']) {
      await open()
      if (close === 'button') await drawer.getByRole('button', { name: 'Tutup dialog' }).tap()
      else await page.keyboard.press('Escape')
      await expect(drawer).not.toBeVisible()
      await expect(trigger).toBeFocused()
      expect(await page.evaluate(() => window.scrollY)).toBe(previousScroll)
    }
    // Ordinary form/detail dialogs continue to require their existing close controls.
    await page.getByRole('button', { name: /^Detail/ }).first().click()
    const detail = page.getByRole('dialog', { name: role === 'admin' ? 'Detail data' : 'Detail transaksi' })
    await expect(detail).toBeVisible()
    await page.touchscreen.tap(385, 5)
    await expect(detail).toBeVisible()
    await detail.getByRole('button', { name: 'Tutup dialog' }).tap()
    await expect(detail).not.toBeVisible()
  })
}
