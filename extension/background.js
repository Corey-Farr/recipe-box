// The toolbar action supplies the user's active tab and grants temporary activeTab access.
// Open a full tab so clicking away does not destroy an unsaved import draft.
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`index.html?import=${tab.id ?? ''}`),
  })
})
