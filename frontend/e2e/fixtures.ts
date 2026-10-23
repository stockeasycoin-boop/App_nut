import { test as base, expect, type Page } from '@playwright/test'

export const API = 'http://127.0.0.1:8010'

/** Local date as the app computes it (YYYY-MM-DD). */
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Fixtures = { errors: string[]; app: Page }

/**
 * `app` is a page that fails the test on any uncaught exception or console error.
 * Tests opt into server or demo mode before navigating.
 */
export const test = base.extend<Fixtures>({
  errors: async ({}, use) => {
    await use([])
  },
  app: async ({ page, errors }, use) => {
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      // Network failures we provoke on purpose show up as console errors; ignore those.
      if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`)
    })
    await use(page)
    expect(errors, 'no runtime errors').toEqual([])
  },
})

export async function useServer(page: Page) {
  await page.addInitScript((api) => localStorage.setItem('nutrilens-server', api), API)
}

/** Fresh demo mode: wipe stored data once, before the first load of this test. */
export async function useDemo(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear()
      localStorage.setItem('nutrilens-server', '')
      sessionStorage.setItem('e2e-init', '1')
    }
  })
}

export async function openTab(page: Page, name: 'Today' | 'Insights' | 'Nutrients' | 'Goals') {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name }).click()
}

/** Open the camera, take a photo and wait for the analysis results. */
export async function scanMeal(page: Page) {
  await page.getByRole('button', { name: 'Scan a meal' }).click()
  await expect(page.locator('video')).toHaveJSProperty('readyState', 4)
  await page.getByRole('button', { name: 'Take photo' }).click()
  await expect(page.getByText('Analyzing your meal')).toBeVisible()
  await expect(page.getByTestId('result-item').first()).toBeVisible({ timeout: 15_000 })
}

const readNumber = async (page: Page, testId: string) => Number((await page.getByTestId(testId).innerText()).replace(/[^\d]/g, ''))

/** Read an animated counter once it has stopped moving. */
export async function settledNumber(page: Page, testId: string) {
  let last = -1
  for (let i = 0; i < 40; i++) {
    const v = await readNumber(page, testId)
    if (v === last) return v
    last = v
    await page.waitForTimeout(250)
  }
  return last
}

export const kcalLeft = (page: Page) => settledNumber(page, 'kcal-left')

export { expect }
