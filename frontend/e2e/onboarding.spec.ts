/** First run (from App_nut): login screen, then "About you", then targets from your body. */
import { expect, openTab, test, useDemo } from './fixtures'

test('first run on the device: log in, onboard, start with a clean log', async ({ app }) => {
  await useDemo(app, { firstRun: true })
  await app.goto('/')

  await expect(app.getByText('No account needed. Everything stays on this device.')).toBeVisible()
  await expect(app.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await app.getByRole('button', { name: 'Log in' }).click()

  await expect(app.getByRole('heading', { name: 'About you' })).toBeVisible()
  await expect(app.getByText('Your targets appear here')).toBeVisible()

  // Missing numbers are caught before anything is saved.
  await app.getByRole('button', { name: 'Calculate my targets' }).click()
  await expect(app.getByRole('alert')).toContainText('Age, height and weight are needed')
  await app.getByLabel('Age').fill('15')
  await app.getByLabel('Height').fill('162')
  await app.getByLabel('Weight').fill('58')
  await app.getByRole('button', { name: 'Calculate my targets' }).click()
  await expect(app.getByRole('alert')).toContainText('age 19–110')

  // 31-year-old woman, 162 cm, 58 kg, moderately active, losing weight:
  // BMR 1,276.5 × 1.55 − 500 = 1,479 → 1,500 kcal; protein 58 kg × 2.0 g/kg = 116 g.
  await app.getByLabel('Name').fill('Priya')
  await app.getByLabel('Age').fill('31')
  await app.getByRole('tab', { name: 'Female' }).click()
  await app.getByRole('radio', { name: /Moderately active/ }).click()
  await app.getByRole('radio', { name: /Lose weight/ }).click()
  await expect(app.getByTestId('preview-kcal')).toHaveText('1,500')
  await expect(app.locator('.target-preview')).toContainText('116 g')
  await expect(app.locator('.target-preview')).toContainText('BMI 22.1')
  await app.getByRole('button', { name: 'Calculate my targets' }).click()

  await expect(app.locator('.toast').filter({ hasText: 'Your targets are ready' })).toBeVisible()
  await expect(app.getByRole('heading', { level: 1 })).toContainText('Priya')
  await expect(app.locator('.hero-sub')).toContainText('1,500')
  await expect(app.locator('.meal')).toHaveCount(0) // no sample meals for a real user
  await expect(app.getByLabel('0-day logging streak')).toBeVisible()

  await openTab(app, 'Goals')
  await expect(app.getByRole('button', { name: 'By body weight' })).toHaveAttribute('aria-pressed', 'true')
  await expect(app.locator('.profile-card')).toContainText('Female')

  // Signing out keeps everything; logging back in skips onboarding.
  await app.getByRole('button', { name: /Sign out/ }).click()
  await expect(app.getByRole('button', { name: 'Log in' })).toBeVisible()
  await app.reload()
  await app.getByRole('button', { name: 'Log in' }).click()
  await expect(app.getByRole('heading', { level: 1 })).toContainText('Priya')
  await expect(app.locator('.hero-sub')).toContainText('1,500')
})

test('the name is optional and "rather not say" uses the in-between formula', async ({ app }) => {
  await useDemo(app, { firstRun: true })
  await app.goto('/')
  await app.getByRole('button', { name: 'Log in' }).click()
  await app.getByLabel('Age').fill('30')
  await app.getByLabel('Height').fill('170')
  await app.getByLabel('Weight').fill('70')
  // Defaults: rather not say, sedentary, maintain → (700 + 1,062.5 − 150 − 78) × 1.2 = 1,841 → 1,850.
  await expect(app.getByTestId('preview-kcal')).toHaveText('1,850')
  await expect(app.locator('.target-preview')).toContainText('112 g') // 70 kg × 1.6 g/kg
  await app.getByRole('button', { name: 'Calculate my targets' }).click()
  await expect(app.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)$/)
  await openTab(app, 'Nutrients')
  await app.getByRole('tab', { name: 'Minerals' }).click()
  await expect(app.locator('.nrow').filter({ hasText: 'Iron' })).toContainText('/ 18 mg') // higher of the two RDAs
})
