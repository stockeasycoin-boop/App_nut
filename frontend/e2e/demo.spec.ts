/** Demo mode (no server) — what the Android app does before a server is set. */
import path from 'node:path'
import { API, expect, openTab, scanMeal, test, useDemo } from './fixtures'

const fixture = (f: string) => path.join(import.meta.dirname, 'fixtures', f)

test.beforeEach(async ({ app }) => {
  await useDemo(app)
})

test('demo day: scan is clearly labelled and meals persist on the device', async ({ app }) => {
  await app.goto('/')
  await expect(app.locator('.meal')).toHaveCount(3)
  await scanMeal(app)
  await expect(app.locator('.demo-note')).toContainText('Demo result')
  await app.getByRole('button', { name: /^Log / }).click()
  await expect(app.locator('.toast').filter({ hasText: 'logged' })).toBeVisible()
  await expect(app.locator('.meal')).toHaveCount(4)

  await app.reload()
  await expect(app.locator('.meal')).toHaveCount(4)

  // Delete also persists.
  await app.locator('.meal').first().click()
  await app.getByRole('button', { name: 'Delete' }).click()
  await expect(app.locator('.meal')).toHaveCount(3)
  await app.reload()
  await expect(app.locator('.meal')).toHaveCount(3)
})

test('demo goals persist on the device', async ({ app }) => {
  await app.goto('/')
  await openTab(app, 'Goals')
  await app.getByRole('tab', { name: /Gain/ }).click()
  await app.getByRole('button', { name: 'Save goals' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Goals saved' })).toBeVisible()
  await app.reload()
  await openTab(app, 'Goals')
  await expect(app.getByTestId('goal-kcal')).toHaveText('2,900')
  await expect(app.getByRole('tab', { name: /Gain/ })).toHaveAttribute('aria-selected', 'true')
})

test('without a camera preview the shutter falls back to the system camera', async ({ app }) => {
  await app.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'))
  })
  await app.goto('/')
  await app.getByRole('button', { name: 'Scan a meal' }).click()
  await expect(app.getByText('Camera preview isn’t available')).toBeVisible()
  const chooser = app.waitForEvent('filechooser')
  await app.getByRole('button', { name: 'Take photo' }).click()
  await (await chooser).setFiles(fixture('landscape-meal.jpg'))
  await expect(app.getByTestId('result-item').first()).toBeVisible({ timeout: 15_000 })
})

test('sample meal button analyses the sample photo', async ({ app }) => {
  await app.goto('/')
  await app.getByRole('button', { name: 'Scan a meal' }).click()
  await app.getByRole('button', { name: 'Try a sample meal' }).click()
  await expect(app.getByTestId('result-item')).toHaveCount(8, { timeout: 15_000 })
})

test('connecting to a server and back to demo mode', async ({ app }) => {
  await app.goto('/')
  await openTab(app, 'Goals')
  await app.getByRole('button', { name: /Server/ }).click()
  const sheet = app.getByRole('dialog')

  await sheet.getByLabel('Server address').fill('127.0.0.1:9')
  await sheet.getByRole('button', { name: 'Test & connect' }).click()
  await expect(sheet.getByRole('alert')).toContainText('Couldn’t reach')

  await sheet.getByLabel('Server address').fill(API.replace('http://', ''))
  await sheet.getByRole('button', { name: 'Test & connect' }).click()
  await expect(app.locator('.toast').filter({ hasText: 'Connected to server' })).toBeVisible()
  await expect(app.getByRole('button', { name: /Server/ })).toContainText('127.0.0.1:8010')
  expect(await app.evaluate(() => localStorage.getItem('nutrilens-server'))).toBe(API)

  await app.getByRole('button', { name: /Server/ }).click()
  await app.getByRole('button', { name: 'Use demo mode on this device' }).click()
  await expect(app.getByRole('button', { name: /Server/ })).toContainText('Demo mode')
  await openTab(app, 'Today')
  await expect(app.locator('.meal')).toHaveCount(3)
})

test('dark mode is remembered', async ({ app }) => {
  await app.goto('/')
  await openTab(app, 'Goals')
  await app.getByRole('tab', { name: /Dark/ }).click()
  await expect(app.locator('html')).toHaveAttribute('data-theme', 'dark')
  await app.reload()
  await expect(app.locator('html')).toHaveAttribute('data-theme', 'dark')
  const bg = await app.locator('.device').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(12, 14, 18)')
})
