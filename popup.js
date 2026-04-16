function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function tryPrettyJSON(val) {
  try { return JSON.stringify(JSON.parse(val), null, 2) } catch { return val }
}

function renderKVTable(data) {
  const entries = Object.entries(data)
  if (!entries.length) return '<p class="empty">Empty.</p>'
  return `
    <table>
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>
        ${entries.map(([k, v]) => `
          <tr>
            <td class="key">${esc(k)}</td>
            <td class="val"><pre>${esc(tryPrettyJSON(v))}</pre></td>
          </tr>`).join('')}
      </tbody>
    </table>`
}

function renderCookiesTable(cookies) {
  if (!cookies.length) return '<p class="empty">Empty.</p>'
  return `
    <table>
      <thead><tr><th>Name</th><th>Value</th><th>Flags</th></tr></thead>
      <tbody>
        ${cookies.map(c => {
          const flags = [
            c.secure ? 'Secure' : '',
            c.httpOnly ? 'HttpOnly' : '',
            c.sameSite ? c.sameSite : '',
            c.session ? 'Session' : '',
          ].filter(Boolean).join(', ')
          return `
            <tr>
              <td class="key">${esc(c.name)}</td>
              <td class="val"><pre>${esc(tryPrettyJSON(c.value))}</pre></td>
              <td class="flag">${esc(flags)}</td>
            </tr>`
        }).join('')}
      </tbody>
    </table>`
}

function renderCacheList(entries) {
  if (!entries.length) return '<p class="empty">Empty.</p>'
  return `
    <ul class="cache-list">
      ${entries.map(e => `<li>${esc(e)}</li>`).join('')}
    </ul>`
}

function section(title, contentHtml) {
  return `
    <div class="section">
      <div class="section-header">${title}</div>
      ${contentHtml}
    </div>`
}

// Runs inside the active tab — reads storage and returns plain objects
function readTabStorage() {
  const local = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    local[k] = localStorage.getItem(k)
  }

  const session = {}
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    session[k] = sessionStorage.getItem(k)
  }

  async function getCacheEntries() {
    if (!('caches' in self)) return []
    const names = await caches.keys()
    const entries = []
    for (const name of names) {
      const cache = await caches.open(name)
      const reqs = await cache.keys()
      reqs.forEach(r => entries.push(`[${name}] ${r.url}`))
    }
    return entries
  }

  return getCacheEntries().then(cacheEntries => ({ local, session, cacheEntries }))
}

async function init() {
  const contentEl = document.getElementById('content')
  const originEl  = document.getElementById('origin')

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      contentEl.innerHTML = '<p class="error">Cannot inspect this page.<br>Navigate to a regular website and try again.</p>'
      originEl.textContent = tab?.url ?? '—'
      return
    }

    originEl.textContent = new URL(tab.url).origin

    // Read localStorage, sessionStorage, and Cache API from the tab
    const [{ result: storageData }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readTabStorage,
    })

    // Read cookies via the extension API (has access to HttpOnly cookies too)
    const cookies = await chrome.cookies.getAll({ url: tab.url })

    const { local, session, cacheEntries } = storageData

    const localStorageString = section('localStorage', renderKVTable(local))
    const sessionStorageString = section('sessionStorage', renderKVTable(session))
    const cookiesString = section('Cookies', renderCookiesTable(cookies))
    const cacheAPIString = section('Cache API', renderCacheList(cacheEntries))
    const downloadButton = `
      <div class="section">
        <div class="section-header"></div>
        <button id="download-button">Open in New Tab</button>
      </div>
    `

    contentEl.innerHTML =
      localStorageString +
      sessionStorageString +
      cookiesString +
      cacheAPIString + 
      downloadButton
    
    document.getElementById('download-button').addEventListener('click', async () => {
      const css = await fetch(chrome.runtime.getURL('popup.css')).then(r => r.text())
      const origin = originEl.textContent

      const html = `<!doctype html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>metadata — ${esc(origin)}</title>
          <style>
            body { width: auto; max-height: none; margin: 0; }
            main { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
            ${css}
          </style>
        </head>
        <body>
          <main>
            <div id="origin-bar"><span id="origin">${esc(origin)}</span></div>
            <div id="content">${localStorageString + sessionStorageString + cookiesString + cacheAPIString}</div>
          </main>
        </body>
        </html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      chrome.tabs.create({ url })
    })

  } catch (err) {
    contentEl.innerHTML = `<p class="error">Error: ${esc(err.message)}</p>`
  }
}

init()
