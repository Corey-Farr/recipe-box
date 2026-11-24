import { test, expect, chromium } from '@playwright/test'
import type { BrowserContext, CDPSession, Page } from '@playwright/test'
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { unzipSync } from 'fflate'

let context: BrowserContext
let cdp: CDPSession
let temporary: string
let extensionId: string

test.beforeEach(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'recipe-box-test-'))
  const root = join(temporary, 'extension')
  const files = unzipSync(new Uint8Array(await readFile('release/recipe-box-1.0.0.zip')))
  for (const [name, bytes] of Object.entries(files)) {
    const destination = resolve(root, name)
    await mkdir(resolve(destination, '..'), { recursive: true })
    await writeFile(destination, bytes)
  }
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
  expect(manifest.permissions).toEqual(['activeTab', 'scripting'])
  expect(manifest.host_permissions).toBeUndefined()
  extensionId = createHash('sha256')
    .update(Buffer.from(manifest.key, 'base64'))
    .digest('hex')
    .slice(0, 32)
    .replace(/[0-9a-f]/g, (digit) => String.fromCharCode(97 + parseInt(digit, 16)))
  context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`,
      '--enable-unsafe-extension-debugging',
    ],
  })
  cdp = await context.browser()!.newBrowserCDPSession()
  // A cold installation may still be registering its action listener. Wait for
  // the real worker's execution context rather than racing extension startup.
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  expect(await worker.evaluate(() => chrome.runtime.id)).toBe(extensionId)
})
test.afterEach(async () => {
  await context?.close()
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

async function toolbarImport(fixture: Page) {
  await fixture.bringToFront()
  const { targetInfos } = await cdp.send('Target.getTargets', {
    filter: [{ type: 'tab', exclude: false }, { exclude: true }],
  })
  const tab = targetInfos.find((t) => t.type === 'tab' && t.url === fixture.url())
  if (!tab) throw new Error('No browser tab target for fixture')
  // Browser-level action trigger grants activeTab and runs the production toolbar worker.
  // Extraction is never mocked and no recipe payload is supplied by this test.
  const popupPromise = context.waitForEvent('page')
  await cdp.send('Extensions.triggerAction', { id: extensionId, targetId: tab.targetId })
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  return popup
}

test('packaged extension imports the active fixture tab and persists in collection', async () => {
  const fixture = await context.newPage()
  await fixture.goto('http://127.0.0.1:4173/fixtures/recipes.html')
  const popup = await toolbarImport(fixture)
  await expect(popup.getByRole('heading', { name: 'Choose a recipe' })).toBeVisible()
  await expect(popup.getByLabel('Recipe on this page').locator('option')).toHaveCount(2)
  await popup.getByRole('button', { name: 'Review selected recipe' }).click()
  await expect(popup.getByLabel('Ingredients', { exact: false })).toHaveValue(/1½ cups rice/)
  await expect(popup.getByLabel('Directions', { exact: false })).toHaveValue(/# Cook the rice/)
  await popup.getByLabel('Recipe title').fill('Imported from the real tab')
  await popup.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await expect(popup.getByRole('heading', { name: 'Imported from the real tab' })).toBeVisible()
  const collection = await context.newPage()
  await collection.goto(`chrome-extension://${extensionId}/index.html`)
  await collection.getByRole('button', { name: /Imported from the real tab/ }).click()
  await expect(collection.getByRole('link', { name: 'Original recipe' })).toHaveAttribute(
    'href',
    fixture.url(),
  )
  await expect(collection.getByText('1½ cups rice', { exact: true })).toBeVisible()
})

test('manual fallback retains source; cancel creates no recipe', async () => {
  const fixture = await context.newPage()
  await fixture.goto('http://127.0.0.1:4173/fixtures/manual.html')
  let popup = await toolbarImport(fixture)
  await expect(popup.getByRole('heading', { name: 'Import preview' })).toBeVisible()
  await expect(popup.getByLabel('Source URL')).toHaveValue(fixture.url())
  await popup.getByLabel('Recipe title').fill('Canceled toast')
  await popup.getByRole('button', { name: 'Cancel', exact: true }).first().click()
  await expect(popup.locator('.recipe-card')).toHaveCount(0)
  await popup.close()
  popup = await toolbarImport(fixture)
  await popup.getByLabel('Recipe title').fill('Garlicky toast')
  await popup
    .getByLabel('Ingredients', { exact: false })
    .fill('2 slices bread\n1 tablespoon olive oil\n1 garlic clove')
  await popup
    .getByLabel('Directions', { exact: false })
    .fill('Toast the bread.\nRub with garlic and drizzle with oil.')
  await popup.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await popup.getByRole('button', { name: 'All recipes' }).click()
  await expect(popup.locator('.recipe-card')).toHaveCount(1)
  await expect(popup.getByRole('button', { name: /Garlicky toast/ })).toBeVisible()
})

test('restricted pages give actionable feedback and allow manual entry', async () => {
  const fixture = await context.newPage()
  await fixture.goto('chrome://version')
  const popup = await toolbarImport(fixture)
  await expect(popup.getByRole('alert')).toContainText('Chrome cannot import this page')
  await popup.getByRole('button', { name: 'Add your own' }).click()
  await expect(popup.getByLabel('Recipe title')).toBeVisible()
})
