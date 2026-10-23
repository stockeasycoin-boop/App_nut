/**
 * Full user journey against the real backend (mock recognizer, fresh database).
 * Tests run in order and build on each other, like a person using the app for a day.
 */
import path from 'node:path'
import { API, expect, kcalLeft, openTab, scanMeal, settledNumber, test, today, useServer } from './fixtures'

test.describe.configure({ mode: 'serial' })

const fixture = (f: string) => path.join(import.meta.dirname, 'fixtures', f)

async function day(request: import('@playwright/test').APIRequestContext) {
  const r = await request.get(`${API}/v1/days/${today()}`)
  expect(r.ok()).toBeTruthy()
  return r.json()
}

test.beforeEach(async ({ app }) => {
  await useServer(app)
})

test('empty day loads from the server', async ({ app, request }) => {
  await app.goto('/')
  await expect(app.getByRole('heading', { level: 1 })).toContainText('Abhi')
  await expect(app.locator('.meal')).toHaveCount(0)
  const goals = (await day(request)).goals
  await expect.poll(() => kcalLeft(app)).toBe(goals.calories)
  await expect(app.getByLabel('0-day logging streak')).toBeVisible()
  await expect(app.getByRole('button', { name: /Snap your (breakfast|lunch|snack|dinner)/ })).toBeVisible()
})

test('scan with the live camera, adjust, add a missed food and log', async ({ app, request }) => {
  await app.goto('/')
  await scanMeal(app)

  const items = app.getByTestId('result-item')
  await expect(items).toHaveCount(8)
  await expect(app.locator('.pin')).toHaveCount(6)
  await expect(app.getByText('Rainbow Buddha bowl')).toBeVisible()
  await expect(app.locator('.demo-note')).toHaveCount(0)

  // Double the avocado, drop the tahini (step down to the minimum, then remove).
  const avocado = items.filter({ hasText: 'Avocado' })
  await avocado.getByRole('button', { name: 'More Avocado' }).click()
  await avocado.getByRole('button', { name: 'More Avocado' }).click()
  await expect(avocado).toContainText('150 g')
  const tahini = items.filter({ hasText: 'Tahini' })
  for (let i = 0; i < 2; i++) await tahini.getByRole('button', { name: 'Less Tahini dressing' }).click()
  await tahini.getByRole('button', { name: 'Remove Tahini dressing' }).click()
  await expect(items).toHaveCount(7)

  // Something the camera missed: search and add a boiled egg.
  await app.getByRole('button', { name: 'Add something we missed' }).click()
  await app.getByLabel('Search foods').fill('boiled egg')
  await app.getByRole('button', { name: /Boiled egg/ }).click()
  await expect(items).toHaveCount(8)
  await expect(items.filter({ hasText: 'Boiled egg' })).toContainText('50 g')

  const shownKcal = await settledNumber(app, 'result-kcal')
  await app.getByRole('radio', { name: 'Dinner' }).click()
  await app.getByRole('button', { name: /Log dinner/ }).click()

  await expect(app.locator('.toast').filter({ hasText: 'Dinner logged' })).toBeVisible()
  await expect(app.locator('.meal')).toHaveCount(1)

  // The server stored exactly what was on screen, with nutrients it computed itself.
  await expect.poll(async () => (await day(request)).meals.length).toBe(1)
  const meal = (await day(request)).meals[0]
  expect(meal.type).toBe('dinner')
  expect(meal.items).toHaveLength(8)
  expect(meal.items.find((i: { name: string }) => i.name === 'Avocado').grams).toBe(150)
  expect(meal.items.find((i: { name: string }) => i.name === 'Boiled egg')).toMatchObject({ foodId: 'egg-boiled', source: 'database', grams: 50 })
  expect(Math.round(meal.totals.calories)).toBeGreaterThanOrEqual(shownKcal - 1)
  expect(Math.round(meal.totals.calories)).toBeLessThanOrEqual(shownKcal + 1)

  const goals = (await day(request)).goals
  await expect.poll(() => kcalLeft(app)).toBe(Math.round(goals.calories - meal.totals.calories))
})

test('meals persist across reloads and open in detail', async ({ app }) => {
  await app.goto('/')
  await expect(app.locator('.meal')).toHaveCount(1)
  await expect(app.getByLabel('1-day logging streak')).toBeVisible()
  await app.locator('.meal').first().click()
  const sheet = app.getByRole('dialog')
  await expect(sheet).toContainText('Rainbow Buddha bowl')
  await expect(sheet).toContainText('Boiled egg')
  await expect(sheet.locator('.ms-hero img')).toHaveJSProperty('complete', true)
  expect(await sheet.locator('.ms-hero img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
})

test('quick add and food search log meals without a photo', async ({ app, request }) => {
  await app.goto('/')
  await app.getByRole('button', { name: 'Add Tandoori chicken' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Tandoori chicken added' })).toBeVisible()
  await app.getByRole('button', { name: /Search 50\+ foods/ }).click()
  await app.getByLabel('Search foods').fill('banana')
  await app.getByRole('button', { name: /Banana/ }).click()
  await expect(app.locator('.meal')).toHaveCount(3)
  await expect.poll(async () => (await day(request)).meals.length).toBe(3)
  const names = (await day(request)).meals.map((m: { name: string }) => m.name)
  expect(names).toEqual(expect.arrayContaining(['Tandoori chicken', 'Banana']))
})

test('water is saved to the server', async ({ app, request }) => {
  await app.goto('/')
  await app.getByRole('button', { name: '3 glasses' }).click()
  await expect.poll(async () => (await day(request)).waterGlasses).toBe(3)
  await app.reload()
  await expect(app.getByText('0.75 L')).toBeVisible()
  // Tapping a full glass empties back down to it.
  await app.getByRole('button', { name: '2 glasses' }).click()
  await expect.poll(async () => (await day(request)).waterGlasses).toBe(1)
})

test('gallery upload of a landscape photo is cropped square and analysed', async ({ app, request }) => {
  await app.goto('/')
  await app.getByRole('button', { name: 'Scan a meal' }).click()
  const upload = app.waitForRequest((r) => r.url().endsWith('/v1/meals/analyze'))
  await app.getByTestId('gallery-input').setInputFiles(fixture('landscape-meal.jpg'))
  await upload
  await expect(app.getByTestId('result-item').first()).toBeVisible({ timeout: 15_000 })
  // The stored photo is square, so pins line up with what the user sees.
  const src = await app.locator('.scan-photo').getAttribute('src')
  const dims = await app.evaluate(async (url) => {
    const img = new Image()
    img.src = url!
    await img.decode()
    return [img.naturalWidth, img.naturalHeight]
  }, src)
  expect(dims[0]).toBe(dims[1])
  await app.getByRole('button', { name: 'Close' }).click()
  expect((await day(request)).meals).toHaveLength(3) // backing out logs nothing
})

test('a file that is not an image is rejected kindly', async ({ app }) => {
  await app.goto('/')
  await app.getByRole('button', { name: 'Scan a meal' }).click()
  await app.getByTestId('gallery-input').setInputFiles(fixture('not-an-image.txt'))
  await expect(app.locator('.toast').filter({ hasText: 'Couldn’t open that image' })).toBeVisible()
  await expect(app.getByRole('button', { name: 'Take photo' })).toBeVisible()
})

test('analysis failures from the server are shown and recoverable', async ({ app }) => {
  await app.route('**/v1/meals/analyze', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ detail: 'The analysis service is busy. Please try again in a moment.' }) }))
  await app.goto('/')
  await app.getByRole('button', { name: 'Scan a meal' }).click()
  await expect(app.locator('video')).toHaveJSProperty('readyState', 4)
  await app.getByRole('button', { name: 'Take photo' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'service is busy' })).toBeVisible()
  await expect(app.getByRole('button', { name: 'Take photo' })).toBeVisible()
})

test('a failed save rolls the meal back', async ({ app, request }) => {
  await app.goto('/')
  await expect(app.locator('.meal')).toHaveCount(3)
  await app.route('**/v1/meals', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 500, body: '{}' }) : r.continue()))
  await app.getByRole('button', { name: 'Add Paneer curry' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Not added' })).toBeVisible()
  await expect(app.locator('.meal')).toHaveCount(3)
  expect((await day(request)).meals).toHaveLength(3)
})

test('deleting a meal removes it on the server', async ({ app, request }) => {
  await app.goto('/')
  await app.locator('.meal').filter({ hasText: 'Banana' }).click()
  await app.getByRole('button', { name: 'Delete' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Meal removed' })).toBeVisible()
  await expect(app.locator('.meal')).toHaveCount(2)
  await expect.poll(async () => (await day(request)).meals.length).toBe(2)
})

test('goals: changing the aim and calories saves to the server', async ({ app, request }) => {
  await app.goto('/')
  await openTab(app, 'Goals')
  await expect(app.getByTestId('goal-kcal')).toHaveText('2,100')
  await app.getByRole('tab', { name: /Maintain/ }).click()
  await expect(app.getByTestId('goal-kcal')).toHaveText('2,600')
  await app.getByRole('button', { name: 'High protein' }).click()
  await app.getByRole('button', { name: 'Save goals' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Goals saved' })).toBeVisible()
  await expect(app.getByRole('button', { name: 'Goals saved' })).toBeDisabled()

  const goals = (await (await request.get(`${API}/v1/goals`)).json()).values
  expect(goals.calories).toBe(2600)
  expect(goals.protein).toBe(Math.round((2600 * 35) / 400))

  // Today reflects the new target.
  await openTab(app, 'Today')
  await expect(app.locator('.hero-sub')).toContainText('2,600')

  // A hand-picked calorie target sticks.
  await openTab(app, 'Goals')
  await app.getByLabel('Daily calorie target').evaluate((el: HTMLInputElement) => {
    // Drive the slider the way a drag does: native value setter + input event.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, '2300')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await app.getByRole('button', { name: 'Save goals' }).click()
  await expect(app.locator('.toast').filter({ hasText: '2,300 kcal' })).toBeVisible()
  const custom = await (await request.get(`${API}/v1/goals`)).json()
  expect(custom.values.calories).toBe(2300)
  expect(custom.custom).toContain('calories')
})

test('profile edits recalculate goals', async ({ app, request }) => {
  await app.goto('/')
  await openTab(app, 'Goals')
  await app.getByRole('button', { name: 'Edit profile' }).click()
  const sheet = app.getByRole('dialog')
  await sheet.getByLabel('Name').fill('Priya')
  await sheet.getByRole('tab', { name: 'Female' }).click()
  await sheet.getByLabel('Weight', { exact: true }).fill('60')
  await sheet.getByRole('button', { name: 'Done' }).click()
  await app.getByRole('button', { name: 'Save goals' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Goals saved' })).toBeVisible()

  const profile = await (await request.get(`${API}/v1/profile`)).json()
  expect(profile).toMatchObject({ name: 'Priya', sex: 'female', weightKg: 60 })
  const goals = (await (await request.get(`${API}/v1/goals`)).json()).values
  expect(goals.iron).toBe(18) // female RDA
  await openTab(app, 'Today')
  await expect(app.getByRole('heading', { level: 1 })).toContainText('Priya')
})

test('insights and nutrients reflect what was logged', async ({ app, request }) => {
  await app.goto('/')
  const totals = (await day(request)).totals
  await openTab(app, 'Insights')
  await expect(app.locator('.chart-readout b')).toHaveText(Math.round(totals.calories).toLocaleString('en-IN'))
  await expect(app.getByText('Today so far')).toBeVisible()
  await app.getByRole('tab', { name: '30 days' }).click()
  await expect(app.locator('svg.chart rect[rx]')).toHaveCount(30)
  await expect(app.getByText('Last 30 days')).toBeVisible()

  await openTab(app, 'Nutrients')
  await app.getByRole('button', { name: /Vitamin C/ }).click()
  await expect(app.getByText('Today’s sources')).toBeVisible()
  await expect(app.locator('.src').first()).toContainText('Rainbow Buddha bowl')
  await app.getByRole('tab', { name: 'Minerals' }).click()
  await expect(app.locator('.nrow')).toHaveCount(7)
})

test('server down: a clear error with retry', async ({ app }) => {
  await app.route(`${API}/**`, (r) => r.abort('connectionrefused'))
  await app.goto('/')
  await expect(app.getByRole('alert')).toContainText('Couldn’t reach the server')
  await app.unroute(`${API}/**`)
  await app.getByRole('button', { name: 'Retry' }).click()
  await expect(app.getByRole('alert')).toHaveCount(0)
  await expect(app.locator('.meal')).toHaveCount(2)
})
