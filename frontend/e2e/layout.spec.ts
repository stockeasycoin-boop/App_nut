/** Visual sanity on every screen: no sideways scrolling, images load, both themes. */
import { expect, openTab, test, useDemo } from './fixtures'

const TABS = ['Today', 'Insights', 'Nutrients', 'Goals'] as const

for (const theme of ['light', 'dark'] as const) {
  test(`no horizontal overflow on any screen (${theme})`, async ({ app }) => {
    await useDemo(app)
    await app.emulateMedia({ colorScheme: theme })
    await app.goto('/')
    for (const tab of TABS) {
      await openTab(app, tab)
      await app.waitForTimeout(600)
      const overflow = await app.evaluate(() => {
        const scroll = document.querySelector('.scroll')!
        return { page: document.documentElement.scrollWidth - innerWidth, scroll: scroll.scrollWidth - scroll.clientWidth }
      })
      expect(overflow, `${tab} overflows`).toEqual({ page: 0, scroll: 0 })
    }
  })
}

test('all images on Today load', async ({ app }) => {
  await useDemo(app)
  await app.goto('/')
  await app.waitForLoadState('networkidle')
  const broken = await app.evaluate(() =>
    Array.from(document.images)
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.src),
  )
  expect(broken).toEqual([])
})

test('desktop shows the phone frame with the brand panel', async ({ app }) => {
  await useDemo(app)
  await app.setViewportSize({ width: 1440, height: 900 })
  await app.goto('/')
  await expect(app.getByRole('heading', { name: /Snap your plate/ })).toBeVisible()
  const box = await app.locator('.device').boundingBox()
  expect(box!.width).toBe(400)
})
