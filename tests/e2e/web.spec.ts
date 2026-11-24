import { test, expect } from '@playwright/test'
import { mkdir, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test('sample import, correction, save, reload and ingredient search', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a sample import' }).click()
  await page.getByRole('button', { name: 'Review selected recipe' }).click()
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible()
  await expect(page.getByLabel('Recipe title')).toBeFocused()
  await page.getByLabel('Recipe title').fill('My Sunday lemon rice')
  await page
    .getByLabel('Ingredients', { exact: false })
    .fill('1½ cups rice\n2 (14 oz) cans of chickpeas\n1 teaspoon sumac\nsalt to taste')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.reload()
  await page.getByRole('searchbox').fill('sumac')
  await page.getByRole('button', { name: /My Sunday lemon rice/ }).click()
  await expect(page.getByRole('heading', { name: 'My Sunday lemon rice' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Original recipe' })).toHaveAttribute(
    'href',
    /fixtures\/recipes.html/,
  )
})

test('cancel leaves collection untouched; returning edits survive seed', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a sample import' }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.recipe-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'Add your own' }).click()
  await page.getByLabel('Recipe title').fill('Do not save me')
  await page.getByRole('button', { name: 'Cancel', exact: true }).first().click()
  await page.reload()
  await expect(page.locator('.recipe-card')).toHaveCount(3)
  await page.getByRole('button', { name: /Lemon rice & crispy chickpeas/ }).click()
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click()
  await page.getByLabel('Recipe title').fill('My keeper')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /My keeper/ })).toBeVisible()
  await expect(page.locator('.recipe-card')).toHaveCount(3)
})

for (const width of [1360, 390]) {
  test(`cooking, notes, fresh session, keyboard and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Recipe Box home' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Try a sample import' })).toBeFocused()
    await page.getByRole('button', { name: /Lemon rice & crispy chickpeas/ }).click()
    await page.getByLabel('Servings', { exact: false }).fill('6')
    await expect(page.getByText('2¼ cups rice', { exact: true })).toBeVisible()
    await page.getByRole('checkbox', { name: '2¼ cups rice' }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('checkbox', { name: '2¼ cups rice' })).toBeChecked()
    await page.getByLabel('Personal note', { exact: true }).fill('Add dill next time.')
    await page.getByRole('button', { name: 'Save note', exact: true }).click()
    await page.getByRole('button', { name: 'Start fresh cooking session' }).click()
    await expect(page.getByRole('checkbox', { name: '2¼ cups rice' })).not.toBeChecked()
    await expect(page.getByLabel('Personal note', { exact: true })).toHaveValue(
      'Add dill next time.',
    )
    await page.getByLabel('Servings', { exact: false }).fill('4')
    await expect(page.getByText('1½ cups rice', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await page.getByRole('button', { name: /Lemon rice & crispy chickpeas/ }).click()
    await expect(page.getByLabel('Personal note', { exact: true })).toHaveValue(
      'Add dill next time.',
    )
    await expect(page.getByText('1½ cups rice', { exact: true })).toBeVisible()
  })
}

test('storage unavailable is recoverable and a failed save preserves draft', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add your own' }).click()
  await page.getByLabel('Recipe title').fill('Storage test')
  await page.getByLabel('Ingredients', { exact: false }).fill('1 carrot')
  await page.getByLabel('Directions', { exact: false }).fill('Slice and roast.')
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError')
    }
  })
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Your draft is still here')
  await expect(page.getByLabel('Recipe title')).toHaveValue('Storage test')
})

test('production assets work at a repository subpath', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/recipe-box/')
  await expect(page.locator('.recipe-card')).toHaveCount(3)
  await page.getByRole('button', { name: 'Try a sample import' }).click()
  await page.getByRole('button', { name: 'Review selected recipe' }).click()
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible()
  expect(errors).toEqual([])
})

test('two open tabs keep each other’s saved recipes', async ({ page, context }) => {
  await page.goto('/')
  const other = await context.newPage()
  await other.goto('/')
  for (const [tab, title] of [
    [page, 'First tab supper'],
    [other, 'Second tab supper'],
  ] as const) {
    await tab.getByRole('button', { name: 'Add your own' }).click()
    await tab.getByLabel('Recipe title').fill(title)
    await tab.getByLabel('Ingredients', { exact: false }).fill('1 carrot')
    await tab.getByLabel('Directions', { exact: false }).fill('Roast until tender.')
    await tab.getByRole('button', { name: 'Save recipe', exact: true }).click()
  }
  await page.reload()
  await expect(page.locator('.recipe-card')).toHaveCount(5)
  await expect(page.getByRole('button', { name: /First tab supper/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Second tab supper/ })).toBeVisible()
})

test('ambiguous yield requires baseline and then scales from original', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add your own' }).click()
  await page.getByLabel('Recipe title').fill('A loaf for sharing')
  await page.getByLabel('Original yield').fill('1 loaf')
  await page.getByLabel('Ingredients', { exact: false }).fill('2 cups flour')
  await page.getByLabel('Directions', { exact: false }).fill('Mix, shape and bake.')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await expect(page.getByText('This yield needs a baseline before scaling.')).toBeVisible()
  await page.getByRole('button', { name: 'Set baseline servings' }).click()
  await page.getByLabel('Baseline servings').fill('4')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await page.getByLabel('Servings', { exact: false }).fill('6')
  await expect(page.getByText('3 cups flour', { exact: true })).toBeVisible()
})

test('keyboard import and save at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Recipe on this page')).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Recipe title')).toBeFocused()
  await page.keyboard.type('Keyboard supper')
  // Native form order: yield, baseline, ingredients, directions, source, notes, save.
  for (let i = 0; i < 7; i++) await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Save recipe', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /Keyboard supper/ })).toBeVisible()
})

test('capture showcase from the working production app', async ({ browser }, testInfo) => {
  const capture = process.env.CAPTURE_DOCS === '1'
  const output = capture ? resolve('docs/screenshots') : testInfo.outputPath('screenshots')
  await mkdir(output, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 1360, height: 1080 },
    recordVideo: { dir: testInfo.outputPath('video'), size: { width: 1360, height: 1080 } },
  })
  const page = await context.newPage()
  // Deliberate presentation pacing only when exporting the demo recording.
  const pause = (ms = 2000) => (capture ? page.waitForTimeout(ms) : Promise.resolve())
  await page.goto('http://127.0.0.1:4173/')
  await page.screenshot({ path: resolve(output, 'collection.png'), fullPage: true })
  await pause(3000)
  await page.getByRole('button', { name: 'Try a sample import' }).click()
  await pause()
  await page.getByRole('button', { name: 'Review selected recipe' }).click()
  await pause()
  await page.getByLabel('Recipe title').fill('Sunday lemon rice & crispy chickpeas')
  await page.screenshot({ path: resolve(output, 'import-preview.png'), fullPage: true })
  await pause()
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await pause()
  await page.getByLabel('Servings', { exact: false }).fill('6')
  await pause()
  await page.getByRole('checkbox', { name: '2¼ cups rice' }).check()
  await pause()
  await page
    .getByLabel('Personal note', { exact: true })
    .fill('More lemon, a handful of dill. Keep this one for Sunday lunch.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await pause()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(output, 'mobile-cooking.png'), fullPage: true })
  const video = page.video()!
  await context.close()
  if (capture) {
    await mkdir('docs/media', { recursive: true })
    await copyFile(await video.path(), 'docs/media/demo.webm')
  }
})
