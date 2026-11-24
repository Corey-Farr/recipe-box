export const isExtension = import.meta.env.MODE === 'extension'
export interface PageMetadata {
  blocks: string[]
  source: string
}
export async function importActivePage(tabId: number): Promise<PageMetadata> {
  let tab: chrome.tabs.Tab
  try {
    tab = await chrome.tabs.get(tabId)
  } catch {
    throw new Error(
      'The recipe tab is no longer available. Reopen it and click the Recipe Box toolbar button. Manual entry is still available.',
    )
  }
  const source = tab?.url ?? ''
  if (!tab?.id || !/^https?:\/\//i.test(source))
    throw new Error(
      'Chrome cannot import this page. Open a regular http or https recipe page, then click Recipe Box again. You can also enter a recipe manually.',
    )
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // The toolbar action captured this tab before opening the editor. No background browsing.
      func: () => ({
        blocks: Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
          (el) => el.textContent ?? '',
        ),
        source: location.href,
      }),
    })
    const result = results[0]?.result as PageMetadata | undefined
    if (!result) throw new Error('No result')
    return result
  } catch {
    throw new Error(
      'Chrome could not read this tab. Click the extension toolbar button on the recipe page to grant access, then try again. Manual entry is still available.',
    )
  }
}
