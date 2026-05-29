const GIST_FILENAME = 'atelier-mehdi.json'
export const SYNC_CONFIG_KEY = 'atelier-sync-config'

export function loadSyncConfig() {
  try { return JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) ?? 'null') ?? null }
  catch { return null }
}
export function saveSyncConfig(config) {
  if (config) localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
  else localStorage.removeItem(SYNC_CONFIG_KEY)
}

function gistHeaders(token) {
  return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }
}

export async function fetchFromGist(token, gistId) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers: gistHeaders(token) })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const gist = await res.json()
  const file = gist.files[GIST_FILENAME]
  if (!file) throw new Error('File not found in gist')
  const content = file.truncated ? await (await fetch(file.raw_url)).json() : JSON.parse(file.content)
  return content
}

export async function pushToGist(token, gistId, data) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH', headers: gistHeaders(token),
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(data) } } })
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
}

export async function createGist(token, data) {
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST', headers: gistHeaders(token),
    body: JSON.stringify({
      description: 'Atelier by Mehdi — collections data',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(data) } }
    })
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  return (await res.json()).id
}
